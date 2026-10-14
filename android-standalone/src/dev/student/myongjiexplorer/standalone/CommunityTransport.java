package dev.student.myongjiexplorer.standalone;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.SocketTimeoutException;
import java.util.Locale;
import javax.net.ssl.HttpsURLConnection;

/** A bounded, credential-free GET to one build-time URL. No WebView networking. */
public final class CommunityTransport implements CommunityRefreshClient.Transport {
    public static final int MAX_BYTES = 256 * 1024;
    interface ConnectionFactory { HttpsURLConnection open(URL url) throws IOException; }
    private final ConnectionFactory factory;
    public CommunityTransport() { this(url -> (HttpsURLConnection) url.openConnection()); }
    // Host-JVM tests supply an in-memory connection. No test factory is packaged.
    CommunityTransport(ConnectionFactory factory) { this.factory = factory; }

    public static boolean validEndpoint(String value) {
        if (value == null || value.length() > 2048 || !value.matches("https://[a-z0-9.-]+/[A-Za-z0-9_./-]+")) return false;
        try {
            URI uri = new URI(value);
            String host = uri.getHost(), path = uri.getRawPath();
            if (!"https".equals(uri.getScheme()) || host == null || !host.contains(".") || host.endsWith(".")
                || host.matches("[0-9.]+") || host.endsWith(".localhost") || host.equals("localhost")
                || uri.getPort() != -1 || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || path == null || path.equals("/") || path.contains("//") || !uri.normalize().equals(uri)) return false;
            for (String label : host.split("\\.")) if (!label.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) return false;
            for (String segment : path.split("/")) if (segment.equals(".") || segment.equals("..")) return false;
            return true;
        } catch (Exception ignored) { return false; }
    }

    @Override public CommunityRefreshClient.Response fetch(String endpoint, String etag, CommunityRefreshClient.Cancellation cancellation) throws CommunityRefreshClient.Failure {
        if (!validEndpoint(endpoint)) throw new CommunityRefreshClient.Failure("invalid_endpoint");
        HttpsURLConnection connection = null;
        try {
            cancellation.check();
            connection = factory.open(new URL(endpoint));
            final HttpsURLConnection active = connection;
            cancellation.onCancel(active::disconnect);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setUseCaches(false);
            connection.setAllowUserInteraction(false);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Accept-Encoding", "identity");
            connection.setRequestProperty("Cookie", "");
            connection.setRequestProperty("User-Agent", "MyongjiCampusExplorer/1");
            if (etag != null) {
                if (!etag.matches("\"community-yongin-v[1-9][0-9]{0,15}-[a-f0-9]{64}\"")) throw new CommunityRefreshClient.Failure("invalid_snapshot");
                connection.setRequestProperty("If-None-Match", etag);
            }
            cancellation.check();
            int code = connection.getResponseCode();
            cancellation.check();
            if (code == 304) {
                String received = connection.getHeaderField("ETag");
                if (etag == null || (received != null && !etag.equals(received))) throw new CommunityRefreshClient.Failure("invalid_snapshot");
                return new CommunityRefreshClient.Response(null, true);
            }
            if (code >= 300 && code < 400) throw new CommunityRefreshClient.Failure("redirect");
            if (code != 200) throw new CommunityRefreshClient.Failure("http");
            String contentType = connection.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.ROOT).matches("application/json(?:\\s*;\\s*charset=\"?utf-8\"?)?\\s*")) throw new CommunityRefreshClient.Failure("invalid_content_type");
            String encoding = connection.getContentEncoding();
            if (encoding != null && !encoding.equalsIgnoreCase("identity")) throw new CommunityRefreshClient.Failure("invalid_content_type");
            if (connection.getContentLengthLong() > MAX_BYTES) throw new CommunityRefreshClient.Failure("too_large");
            try (InputStream input = connection.getInputStream()) { return new CommunityRefreshClient.Response(readBounded(input, cancellation), false); }
        } catch (SocketTimeoutException error) {
            cancellation.check(); throw new CommunityRefreshClient.Failure("timeout");
        } catch (IOException | SecurityException error) {
            cancellation.check(); throw new CommunityRefreshClient.Failure("network");
        } finally {
            cancellation.clearCancelAction();
            if (connection != null) connection.disconnect();
        }
    }

    static byte[] readBounded(InputStream input, CommunityRefreshClient.Cancellation cancellation) throws IOException, CommunityRefreshClient.Failure {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        long deadline = System.nanoTime() + 20_000_000_000L;
        for (;;) {
            cancellation.check();
            if (System.nanoTime() > deadline) throw new CommunityRefreshClient.Failure("timeout");
            int count = input.read(buffer);
            if (count == -1) break;
            if (result.size() + count > MAX_BYTES) throw new CommunityRefreshClient.Failure("too_large");
            result.write(buffer, 0, count);
        }
        cancellation.check();
        return result.toByteArray();
    }
}
