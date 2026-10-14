package dev.student.myongjiexplorer.standalone;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.cert.Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HttpsURLConnection;

/** In-memory transports only: no network, Android device, private data or GPS. */
public final class CommunityRefreshClientTest {
    private static final String ENDPOINT = "https://fixture.invalid/v1/community/yongin";
    private static final long NOW = 1791158400000L; // 2026-10-05T00:00:00Z.
    private static int checks;
    private static void check(boolean value, String name) { if (!value) throw new AssertionError(name); checks++; }
    private static byte[] snapshot(int version) { return snapshot(version, "2026-10-04T12:00:00Z"); }
    private static byte[] snapshot(int version, String updated) { return ("{\"schemaVersion\":1,\"campusId\":\"yongin\",\"version\":" + version + ",\"updatedAt\":\"" + updated + "\",\"updates\":[]}").getBytes(StandardCharsets.UTF_8); }

    private static final class MemoryStore implements CommunityRefreshClient.Store {
        volatile byte[] bytes;
        volatile boolean failWrite, failRead;
        volatile int writes, reads;
        public Object lock() { return this; }
        public byte[] read() throws IOException { reads++; if (failRead) throw new IOException("Synthetic read failure"); return bytes; }
        public void write(byte[] value) throws IOException { if (failWrite) throw new IOException("Synthetic write failure"); bytes = value.clone(); writes++; }
    }
    private static final class FakeTransport implements CommunityRefreshClient.Transport {
        volatile byte[] response = snapshot(1);
        volatile int calls;
        volatile String lastEtag;
        volatile boolean notModified;
        volatile boolean blocked;
        volatile String fail;
        final CountDownLatch entered = new CountDownLatch(1);
        public CommunityRefreshClient.Response fetch(String endpoint, String etag, CommunityRefreshClient.Cancellation token) throws CommunityRefreshClient.Failure {
            calls++; lastEtag = etag; entered.countDown();
            while (blocked) { token.check(); try { Thread.sleep(2); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); token.check(); } }
            if (fail != null) throw new CommunityRefreshClient.Failure(fail);
            return new CommunityRefreshClient.Response(notModified ? null : response, notModified);
        }
    }
    private static final class Fixture implements AutoCloseable {
        final MemoryStore store;
        final FakeTransport network = new FakeTransport();
        final List<CommunityRefreshClient.State> states = Collections.synchronizedList(new ArrayList<>());
        final ExecutorService worker = Executors.newSingleThreadExecutor();
        final CommunityRefreshClient client;
        Fixture(String endpoint, byte[] cache) { this(endpoint, cache, new MemoryStore()); }
        Fixture(String endpoint, byte[] cache, MemoryStore shared) {
            store = shared; store.bytes = cache;
            client = new CommunityRefreshClient(endpoint, store, network, states::add, Runnable::run, worker, () -> NOW);
        }
        void ready() throws Exception { client.resume(); client.ready(); settle(); }
        void settle() throws Exception { worker.submit(() -> {}).get(10, TimeUnit.SECONDS); }
        CommunityRefreshClient.State last() { return states.get(states.size() - 1); }
        void refresh() throws Exception { client.refresh(); settle(); }
        public void close() throws Exception { client.close(); check(worker.awaitTermination(10, TimeUnit.SECONDS), "worker stops on destroy"); }
    }

    private static void stateMachine() throws Exception {
        try (Fixture fixture = new Fixture("", snapshot(3))) {
            fixture.ready(); fixture.refresh();
            check(fixture.last().status.equals("unconfigured"), "default endpoint stays honestly unconfigured");
            check(fixture.last().snapshot.version == 3, "private valid cache survives an unconfigured build");
            check(fixture.network.calls == 0, "unconfigured readiness and refresh never connect");
        }
        try (Fixture fixture = new Fixture(ENDPOINT, null)) {
            fixture.client.ready(); fixture.settle();
            check(fixture.store.reads == 0 && fixture.network.calls == 0, "inactive page does no I/O");
            fixture.client.resume(); fixture.settle();
            check(fixture.last().status.equals("idle"), "configured empty cache becomes idle");
            check(fixture.network.calls == 0, "foreground/page readiness never auto-fetches");
            fixture.refresh();
            check(fixture.last().status.equals("updated") && fixture.last().snapshot.version == 1, "manual refresh publishes a validated snapshot");
            check(fixture.store.writes == 1, "validated snapshot persisted once");
            fixture.network.response = ("\n " + new String(snapshot(1), StandardCharsets.UTF_8) + " \n").getBytes(StandardCharsets.UTF_8);
            fixture.refresh();
            check(fixture.last().status.equals("updated") && fixture.store.writes == 1, "same semantic version ignores JSON whitespace without rewriting");
            fixture.network.response = snapshot(1, "2026-10-04T13:00:00Z"); fixture.refresh();
            check(fixture.last().reason.equals("version_conflict") && fixture.last().snapshot.version == 1, "equal version altered data is rejected");
            fixture.network.response = snapshot(2); fixture.refresh();
            check(fixture.last().snapshot.version == 2 && fixture.store.writes == 2, "higher version replaces full snapshot");
            fixture.network.response = snapshot(1); fixture.refresh();
            check(fixture.last().reason.equals("rollback") && fixture.last().snapshot.version == 2, "rollback preserves current cache");
            fixture.network.response = "{\"private\":\"not-a-snapshot\"}".getBytes(StandardCharsets.UTF_8); fixture.refresh();
            check(fixture.last().reason.equals("invalid_snapshot") && fixture.store.writes == 2, "invalid payload cannot reach persistent cache");
            fixture.network.response = snapshot(3); fixture.store.failWrite = true; fixture.refresh();
            check(fixture.last().reason.equals("cache_write") && fixture.last().snapshot.version == 2, "failed persistence retains current state");
            fixture.store.failWrite = false; fixture.network.fail = "timeout"; fixture.refresh();
            check(fixture.last().reason.equals("timeout") && fixture.last().snapshot.version == 2, "network error keeps usable cached snapshot");
            fixture.client.pause(); int requests = fixture.network.calls; fixture.client.refresh(); fixture.settle();
            check(fixture.network.calls == requests, "background cannot start refresh");
            fixture.client.resume(); fixture.settle();
            check(fixture.network.calls == requests, "resume does not silently retry");
        }
        try (Fixture fixture = new Fixture(ENDPOINT, snapshot(4))) {
            fixture.ready();
            check(fixture.last().status.equals("cached") && fixture.last().snapshot.version == 4, "process/page reopen restores cache offline");
            fixture.network.blocked = true; fixture.client.refresh();
            check(fixture.network.entered.await(10, TimeUnit.SECONDS), "synthetic request entered");
            fixture.client.refresh(); fixture.client.pause(); fixture.settle();
            check(fixture.network.calls == 1, "duplicate tap coalesces the in-flight request");
            check(fixture.last().status.equals("cancelled") && fixture.last().snapshot.version == 4, "pause signals cancellation with existing snapshot");
            check(fixture.store.writes == 0, "cancelled response is not persisted");
            fixture.client.resume(); fixture.settle();
            check(fixture.network.calls == 1, "cancelled request does not restart on resume");
        }
        try (Fixture fixture = new Fixture(ENDPOINT, "broken".getBytes(StandardCharsets.UTF_8))) {
            fixture.ready();
            check(fixture.last().reason.equals("invalid_snapshot") && fixture.last().snapshot == null, "corrupt cache is not shown");
            fixture.refresh(); check(fixture.last().status.equals("updated"), "manual valid refresh can recover corrupt cache");
        }
        try (Fixture fixture = new Fixture("http://fixture.invalid/content", null)) {
            fixture.ready(); fixture.refresh();
            check(fixture.last().status.equals("unconfigured") && fixture.last().reason.equals("invalid_endpoint") && fixture.network.calls == 0, "invalid configured URL never connects");
        }
        try (Fixture fixture = new Fixture(ENDPOINT, snapshot(2))) {
            fixture.ready(); fixture.network.blocked = true; fixture.client.refresh();
            check(fixture.network.entered.await(10, TimeUnit.SECONDS), "reload fixture entered");
            fixture.client.pageLoading(); fixture.settle(); int emitted = fixture.states.size();
            check(fixture.store.writes == 0, "page replacement cancels persistence");
            fixture.client.ready(); fixture.settle();
            check(fixture.states.size() > emitted && fixture.network.calls == 1, "replacement page gets state without network restart");
        }
    }

    private static final class FakeConnection extends HttpsURLConnection {
        int code = 200, disconnects, bodyReads;
        String etag;
        String type = "application/json; charset=utf-8", encoding;
        byte[] body = snapshot(1);
        long declared = -1;
        IOException failure;
        FakeConnection() throws Exception { super(new URL(ENDPOINT)); }
        public void connect() {}
        public void disconnect() { disconnects++; }
        public boolean usingProxy() { return false; }
        public String getCipherSuite() { return "synthetic"; }
        public Certificate[] getLocalCertificates() { return null; }
        public Certificate[] getServerCertificates() { return null; }
        public int getResponseCode() throws IOException { if (failure != null) throw failure; return code; }
        public String getContentType() { return type; }
        public String getContentEncoding() { return encoding; }
        public long getContentLengthLong() { return declared; }
        public String getHeaderField(String key) { return "ETag".equalsIgnoreCase(key) ? etag : null; }
        public InputStream getInputStream() { bodyReads++; return new ByteArrayInputStream(body); }
    }
    private static void expectReason(FakeConnection connection, String expected) throws Exception {
        try { new CommunityTransport(url -> connection).fetch(ENDPOINT, null, new CommunityRefreshClient.Cancellation()); throw new AssertionError("Expected " + expected); }
        catch (CommunityRefreshClient.Failure failure) { check(failure.reason.equals(expected), "transport reports only fixed reason " + expected); }
        check(connection.disconnects > 0, "failed connection is closed");
    }
    private static void transportPolicy() throws Exception {
        for (String endpoint : new String[] { ENDPOINT, "https://content.example.org/community/yongin.json" }) check(CommunityTransport.validEndpoint(endpoint), "fixed HTTPS endpoint accepted");
        for (String endpoint : new String[] { "", "https://example.org/", "http://example.org/content", "https://user:pass@example.org/data", "https://example.org:443/data", "https://example.org/data?token=secret", "https://example.org/data#x", "https://127.0.0.1/data", "https://localhost/data", "https://local.localhost/data", "https://example.org./data", "https://bad..example/data", "https://example.org/a/../data", "https://example.org/a/./data", "https://example.org//data", "https://example.org/%2fdata", "https://example.org/\\data", "https://EXAMPLE.org/data" }) check(!CommunityTransport.validEndpoint(endpoint), "noncanonical endpoint rejected");
        FakeConnection connection = new FakeConnection();
        final FakeConnection success = connection;
        CommunityRefreshClient.Response result = new CommunityTransport(url -> success).fetch(ENDPOINT, null, new CommunityRefreshClient.Cancellation());
        check(result.bytes.length == snapshot(1).length && !result.notModified, "bounded JSON body returned");
        check(!connection.getInstanceFollowRedirects() && !connection.getUseCaches() && !connection.getAllowUserInteraction(), "redirects/shared cache/auth interaction disabled");
        check(connection.getConnectTimeout() == 8000 && connection.getReadTimeout() == 8000, "network timeouts fixed");
        check(connection.getRequestMethod().equals("GET") && connection.getRequestProperty("Authorization") == null && connection.getRequestProperty("Cookie").isEmpty(), "GET has no credentials or cookies");
        check(connection.getRequestProperty("Accept-Encoding").equals("identity"), "compression not requested");
        for (int code : new int[] {301,302,303,307,308}) { connection = new FakeConnection(); connection.code = code; expectReason(connection,"redirect"); }
        for (int code : new int[] {204,304,400,401,404,429,500}) { connection = new FakeConnection(); connection.code = code; expectReason(connection,code == 304 ? "invalid_snapshot" : "http"); }
        for (String type : new String[] {null,"text/html","application/json; charset=iso-8859-1"}) { connection = new FakeConnection(); connection.type = type; expectReason(connection,"invalid_content_type"); }
        connection = new FakeConnection(); connection.encoding = "gzip"; expectReason(connection,"invalid_content_type");
        connection = new FakeConnection(); connection.declared = CommunityTransport.MAX_BYTES + 1; expectReason(connection,"too_large");
        connection = new FakeConnection(); connection.body = new byte[CommunityTransport.MAX_BYTES + 1]; expectReason(connection,"too_large");
        connection = new FakeConnection(); connection.failure = new SocketTimeoutException(); expectReason(connection,"timeout");
        connection = new FakeConnection(); connection.failure = new IOException(); expectReason(connection,"network");
        CommunityRefreshClient.Cancellation token = new CommunityRefreshClient.Cancellation(); token.cancel();
        try { new CommunityTransport(url -> { throw new AssertionError("cancelled request opened connection"); }).fetch(ENDPOINT, null, token); throw new AssertionError("expected cancellation"); }
        catch (CommunityRefreshClient.Failure failure) { check(failure.reason.equals("cancelled"), "cancelled request never opens transport"); }
    }
    private static void conditionalAndConcurrent() throws Exception {
        try (Fixture fixture = new Fixture(ENDPOINT, snapshot(1))) {
            fixture.ready(); fixture.network.notModified = true; fixture.refresh();
            check(fixture.network.lastEtag.equals(CommunitySnapshot.parse(snapshot(1), NOW).etag()), "conditional validator binds full cached content");
            check(fixture.last().status.equals("cached") && fixture.store.writes == 0, "304 reuses cache without claiming fresh content or writing disk");
            fixture.network.notModified = false; fixture.network.response = snapshot(2, "2026-10-04T11:00:00Z"); fixture.refresh();
            check(fixture.last().reason.equals("rollback") && fixture.store.writes == 0, "higher version cannot move review time backwards");
            for (int i = 0; i < 30; i++) { fixture.client.pause(); fixture.client.resume(); fixture.client.ready(); }
            fixture.settle(); check(fixture.network.calls == 2, "repeated resume and page readiness cause zero additional requests");
            fixture.network.response = snapshot(2); fixture.refresh();
            check(fixture.last().snapshot.version == 2 && fixture.store.writes == 1, "changed content invalidates saved snapshot once");
        }
        try (Fixture fixture = new Fixture(ENDPOINT, null)) {
            fixture.ready(); fixture.network.notModified = true; fixture.refresh();
            check(fixture.last().reason.equals("invalid_snapshot") && fixture.store.writes == 0, "unsolicited 304 cannot fabricate cache");
        }
        MemoryStore shared = new MemoryStore();
        try (Fixture slow = new Fixture(ENDPOINT, snapshot(1), shared); Fixture fast = new Fixture(ENDPOINT, snapshot(1), shared)) {
            slow.ready(); fast.ready(); slow.network.response = snapshot(2); slow.network.blocked = true; slow.client.refresh();
            check(slow.network.entered.await(10, TimeUnit.SECONDS), "older Activity response in flight");
            fast.network.response = snapshot(3); fast.refresh(); slow.network.blocked = false; slow.settle();
            check(CommunitySnapshot.parse(shared.bytes, NOW).version == 3 && shared.writes == 1, "persistent compare-at-commit prevents cross-Activity rollback");
            check(slow.last().reason.equals("rollback") && slow.last().snapshot.version == 3, "old Activity adopts newer cache when its response loses race");
        }
        shared = new MemoryStore();
        try (Fixture slow = new Fixture(ENDPOINT, snapshot(1), shared); Fixture fast = new Fixture(ENDPOINT, snapshot(1), shared)) {
            slow.ready(); fast.ready(); slow.network.notModified = true; slow.network.blocked = true; slow.client.refresh();
            check(slow.network.entered.await(10, TimeUnit.SECONDS), "304 response in flight before other writer");
            fast.network.response = snapshot(2); fast.refresh(); slow.network.blocked = false; slow.settle();
            check(CommunitySnapshot.parse(shared.bytes, NOW).version == 2 && shared.writes == 1 && slow.last().snapshot.version == 2, "stale 304 cannot restore earlier persistent cache");
        }
        shared = new MemoryStore();
        try (Fixture slow = new Fixture(ENDPOINT, snapshot(1), shared); Fixture fast = new Fixture(ENDPOINT, snapshot(1), shared)) {
            slow.ready(); fast.ready(); slow.network.response = snapshot(2, "2026-10-04T13:00:00Z"); slow.network.blocked = true; slow.client.refresh();
            check(slow.network.entered.await(10, TimeUnit.SECONDS), "conflicting response in flight");
            fast.network.response = snapshot(2); fast.refresh(); slow.network.blocked = false; slow.settle();
            check(slow.last().reason.equals("version_conflict") && shared.writes == 1, "equal-version changed concurrent body cannot overwrite winner");
        }
        final String tag = CommunitySnapshot.parse(snapshot(1), NOW).etag();
        check(!tag.equals(CommunitySnapshot.parse(snapshot(1, "2026-10-04T13:00:00Z"), NOW).etag()), "same version changed body gets distinct validator");
        final FakeConnection unchanged = new FakeConnection(); unchanged.code = 304; unchanged.etag = tag;
        CommunityRefreshClient.Response response = new CommunityTransport(url -> unchanged).fetch(ENDPOINT, tag, new CommunityRefreshClient.Cancellation());
        check(response.notModified && response.bytes == null && unchanged.bodyReads == 0, "304 consumes no response body");
        check(tag.equals(unchanged.getRequestProperty("If-None-Match")), "transport sends exact content validator");
        final FakeConnection invalid = new FakeConnection(); invalid.code = 304; invalid.etag = "\"different\"";
        try { new CommunityTransport(url -> invalid).fetch(ENDPOINT, tag, new CommunityRefreshClient.Cancellation()); throw new AssertionError("mismatched 304 accepted"); }
        catch (CommunityRefreshClient.Failure failure) { check(failure.reason.equals("invalid_snapshot"), "mismatched 304 validator rejected"); }
        final FakeConnection noTag = new FakeConnection(); noTag.code = 304;
        check(new CommunityTransport(url -> noTag).fetch(ENDPOINT, tag, new CommunityRefreshClient.Cancellation()).notModified, "304 without response validator still refers to sent condition");
    }
    public static void main(String[] args) throws Exception {
        stateMachine(); transportPolicy(); conditionalAndConcurrent();
        System.out.println(checks + " native community client/transport checks passed; synthetic connections only, no Android device or network");
    }
}
