package dev.student.myongjiexplorer.standalone;

import android.util.AtomicFile;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Private app storage; one process-wide lock covers every Activity's AtomicFile. */
final class CommunityCache implements CommunityRefreshClient.Store {
    private static final Object COMMIT_LOCK = new Object();
    private final AtomicFile file;
    CommunityCache(File privateDirectory) { file = new AtomicFile(new File(privateDirectory, "community-yongin-v1.json")); }
    @Override public Object lock() { return COMMIT_LOCK; }
    @Override public byte[] read() throws IOException {
        synchronized (COMMIT_LOCK) {
        try (InputStream input = file.openRead()) {
            try { return CommunityTransport.readBounded(input, new CommunityRefreshClient.Cancellation()); }
            catch (CommunityRefreshClient.Failure invalid) { throw new IOException("Invalid private cache"); }
        } catch (FileNotFoundException absent) { return null; }
        }
    }
    @Override public void write(byte[] bytes) throws IOException {
        synchronized (COMMIT_LOCK) {
        if (bytes.length > CommunityTransport.MAX_BYTES) throw new IOException("Oversized private cache");
        FileOutputStream output = null;
        try { output = file.startWrite(); output.write(bytes); file.finishWrite(output); }
        catch (IOException error) { if (output != null) file.failWrite(output); throw error; }
        }
    }
}
