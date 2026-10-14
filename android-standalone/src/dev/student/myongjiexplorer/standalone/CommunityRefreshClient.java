package dev.student.myongjiexplorer.standalone;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Manual refresh state machine. Every network/cache mutation uses one worker. */
public final class CommunityRefreshClient {
    public interface Store { Object lock(); byte[] read() throws IOException; void write(byte[] bytes) throws IOException; }
    public interface Transport { Response fetch(String endpoint, String etag, Cancellation cancellation) throws Failure; }
    public static final class Response {
        public final byte[] bytes;
        public final boolean notModified;
        public Response(byte[] bytes, boolean notModified) { this.bytes = bytes; this.notModified = notModified; }
    }
    public interface Observer { void receive(State state); }
    public interface Dispatcher { void post(Runnable task); }
    public interface Clock { long now(); }
    public static final class Failure extends Exception {
        public final String reason;
        public Failure(String reason) { super(reason); this.reason = reason; }
    }
    public static final class Cancellation {
        private volatile boolean cancelled;
        private Runnable action;
        public void check() throws Failure { if (cancelled || Thread.currentThread().isInterrupted()) throw new Failure("cancelled"); }
        synchronized void onCancel(Runnable action) throws Failure { this.action = action; if (cancelled) { action.run(); throw new Failure("cancelled"); } }
        synchronized void clearCancelAction() { action = null; }
        void cancel() { Runnable pending; synchronized (this) { cancelled = true; pending = action; action = null; } if (pending != null) pending.run(); }
    }
    public static final class State {
        public final String status, reason;
        public final CommunitySnapshot snapshot;
        State(String status, String reason, CommunitySnapshot snapshot) { this.status = status; this.reason = reason; this.snapshot = snapshot; }
    }
    private final Object lock = new Object();
    private final String endpoint;
    private final Store store;
    private final Transport transport;
    private final Observer observer;
    private final Dispatcher dispatcher;
    private final ExecutorService worker;
    private final Clock clock;
    private long generation;
    private boolean active, pageReady, cacheLoaded, busy, closed;
    private Cancellation operation;
    private CommunitySnapshot current;
    private State last;

    public CommunityRefreshClient(String endpoint, Store store, Observer observer, Dispatcher dispatcher) {
        this(endpoint, store, new CommunityTransport(), observer, dispatcher, Executors.newSingleThreadExecutor(), System::currentTimeMillis);
    }
    // Injected transport/store/clock exist for deterministic host tests, never from JS.
    CommunityRefreshClient(String endpoint, Store store, Transport transport, Observer observer, Dispatcher dispatcher, ExecutorService worker, Clock clock) {
        this.endpoint = endpoint == null ? "" : endpoint;
        this.store = store; this.transport = transport; this.observer = observer;
        this.dispatcher = dispatcher; this.worker = worker; this.clock = clock;
        last = new State(configured() ? "idle" : "unconfigured", null, null);
    }
    public boolean configured() { return CommunityTransport.validEndpoint(endpoint); }

    public void resume() {
        synchronized (lock) {
            if (closed) return;
            active = true;
            if (pageReady && !cacheLoaded && !busy) loadCacheLocked();
            else if (pageReady) dispatchLocked(last);
        }
    }
    public void ready() {
        synchronized (lock) {
            if (closed) return;
            pageReady = true;
            if (!active) return;
            if (!cacheLoaded && !busy) loadCacheLocked();
            else dispatchLocked(last);
        }
    }
    public void pageLoading() { cancel(true, false); }
    public void pause() { cancel(false, true); }
    public void close() { cancel(true, true); synchronized (lock) { closed = true; } worker.shutdownNow(); }
    private void cancel(boolean clearPage, boolean deactivate) {
        synchronized (lock) {
            if (closed) return;
            generation++;
            if (operation != null) operation.cancel();
            operation = null;
            boolean wasBusy = busy;
            busy = false;
            if (clearPage) pageReady = false;
            if (deactivate) active = false;
            if (wasBusy) last = new State("cancelled", "cancelled", current);
            if (pageReady && wasBusy) dispatchLocked(last);
        }
    }
    private void loadCacheLocked() {
        final long owner = ++generation;
        final Cancellation token = new Cancellation(); operation = token; busy = true;
        last = new State(configured() ? "loading" : "unconfigured", null, current); dispatchLocked(last);
        worker.execute(() -> {
            CommunitySnapshot loaded = null; String reason = null;
            try { token.check(); synchronized (store.lock()) { byte[] bytes = store.read(); token.check(); if (bytes != null) loaded = CommunitySnapshot.parse(bytes, clock.now()); } }
            catch (Failure ignored) { return; }
            catch (IOException error) { reason = "cache_read"; }
            catch (Exception error) { reason = "invalid_snapshot"; }
            synchronized (lock) {
                if (!owns(owner, token)) return;
                current = loaded; cacheLoaded = true; busy = false; operation = null;
                last = new State(!configured() ? "unconfigured" : reason != null ? "error" : current == null ? "idle" : "cached", reason, current);
                dispatchLocked(last);
            }
        });
    }
    public void refresh() {
        synchronized (lock) {
            if (closed || !active || !pageReady) return;
            if (!configured()) { last = new State("unconfigured", endpoint.isEmpty() ? null : "invalid_endpoint", current); dispatchLocked(last); return; }
            if (busy) return;
            if (!cacheLoaded) { loadCacheLocked(); return; }
            final long owner = ++generation;
            final Cancellation token = new Cancellation(); operation = token; busy = true;
            final CommunitySnapshot requested = current;
            last = new State("loading", null, current); dispatchLocked(last);
            worker.execute(() -> {
                try {
                    Response response = transport.fetch(endpoint, requested == null ? null : requested.etag(), token); token.check();
                    CommunitySnapshot candidate;
                    try {
                        if (response.notModified) {
                            if (requested == null || response.bytes != null) throw new Failure("invalid_snapshot");
                            candidate = requested;
                        } else candidate = CommunitySnapshot.parse(response.bytes, clock.now());
                    }
                    catch (Exception invalid) { throw new Failure("invalid_snapshot"); }
                    token.check();
                    synchronized (lock) {
                        if (!owns(owner, token)) return;
                        // Across Activity recreation, every reader and writer shares this lock.
                        // Re-read inside the transaction: an old response cannot replace a
                        // newer snapshot committed by a different client instance.
                        synchronized (store.lock()) {
                            CommunitySnapshot persistent = null;
                            try {
                                byte[] saved = store.read();
                                if (saved != null) {
                                    try { persistent = CommunitySnapshot.parse(saved, clock.now()); }
                                    catch (CommunitySnapshot.ValidationException invalid) { /* A valid refresh can repair corrupt cache. */ }
                                }
                            } catch (IOException error) { throw new Failure("cache_read"); }
                            if (persistent != null && (current == null || persistent.version > current.version)) current = persistent;
                            validateTransition(candidate, current);
                            validateTransition(candidate, persistent);
                            token.check();
                            if (persistent == null || !candidate.canonicalJson.equals(persistent.canonicalJson)) {
                                try { store.write(candidate.bytes()); } catch (IOException error) { throw new Failure("cache_write"); }
                            }
                        }
                        current = candidate; busy = false; operation = null;
                        last = new State(response.notModified ? "cached" : "updated", null, current); dispatchLocked(last);
                    }
                } catch (Failure error) { finishFailure(owner, token, error.reason); }
                catch (Exception error) { finishFailure(owner, token, "network"); }
            });
        }
    }
    private static void validateTransition(CommunitySnapshot candidate, CommunitySnapshot previous) throws Failure {
        if (previous == null) return;
        if (candidate.version < previous.version || candidate.updatedAtMillis < previous.updatedAtMillis) throw new Failure("rollback");
        if (candidate.version == previous.version && !candidate.canonicalJson.equals(previous.canonicalJson)) throw new Failure("version_conflict");
    }
    private boolean owns(long owner, Cancellation token) { return !closed && active && pageReady && generation == owner && operation == token; }
    private void finishFailure(long owner, Cancellation token, String reason) {
        synchronized (lock) {
            if (!owns(owner, token)) return;
            busy = false; operation = null;
            last = new State(reason.equals("cancelled") ? "cancelled" : "error", reason, current);
            dispatchLocked(last);
        }
    }
    private void dispatchLocked(State state) {
        final long owner = generation;
        dispatcher.post(() -> { synchronized (lock) { if (closed || !pageReady || generation != owner) return; observer.receive(state); } });
    }
}
