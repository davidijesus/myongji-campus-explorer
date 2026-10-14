package dev.student.myongjiexplorer.standalone;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;

/** Converts one trusted local UI action into a constrained Naver handoff.
 * Never accepts an intent URI, destination URL, device location or route request. */
public final class NaverMapLink {
    public static final String REQUEST = "https://appassets.androidplatform.net/native/naver";
    public static final String PACKAGE = "com.nhn.android.nmap";
    private static final String APP_ID = "dev.student.myongjiexplorer.standalone";
    public final String appUrl;
    public final String webUrl;

    private NaverMapLink(String appUrl, String webUrl) {
        this.appUrl = appUrl;
        this.webUrl = webUrl;
    }

    private static String encode(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
    }

    public static NaverMapLink fromRequest(String value) {
        return fromRequest(value, APP_ID);
    }

    public static NaverMapLink fromRequest(String value, String applicationId) {
        try {
            if (applicationId == null || applicationId.length() > 150 || !applicationId.matches("[A-Za-z][A-Za-z0-9_]*(?:\\.[A-Za-z][A-Za-z0-9_]*)+")) return null;
            if (value == null || value.length() > 2048 || !value.startsWith(REQUEST + "?")) return null;
            URI uri = new URI(value);
            if (uri.getRawFragment() != null || uri.getRawQuery() == null) return null;
            Map<String,String> params = new HashMap<>();
            for (String pair : uri.getRawQuery().split("&", -1)) {
                String[] parts = pair.split("=", 2);
                if (parts.length != 2 || !parts[0].matches("campus|place|name|lat|lon") || params.containsKey(parts[0])) return null;
                String decoded = URLDecoder.decode(parts[1], "UTF-8");
                // The bundled UI uses URLSearchParams. Reject alternate encodings,
                // replacement characters, extra URLs and control characters.
                if (!URLEncoder.encode(decoded, "UTF-8").equals(parts[1])) return null;
                params.put(parts[0], decoded);
            }
            String campus = params.get("campus"), name = params.get("name"), place = params.get("place");
            String prefix;
            if (place == null) return null;
            if ("yongin".equals(campus)) {
                if (!place.matches("mju-(?:y-main|y(?:[123]|[5-9]|1[0-9]|2[0-4]|3[0-5]|8[23])|[a-k]|elpenheim|visitors|bus-office|guardhouse|hydraulics|gate|tennis-office)")) return null;
                prefix = "명지대학교 자연캠퍼스 ";
            } else if ("seoul".equals(campus)) {
                if (!place.matches("mju-(?:s(?:[1-5]|[89]|10)|seoul-(?:field|gate|guardhouse))")) return null;
                prefix = "명지대학교 인문캠퍼스 ";
            }
            else return null;
            if (name == null || !name.startsWith(prefix) || name.length() <= prefix.length() || name.length() > 180 ||
                !name.trim().equals(name) || name.matches("(?s).*[\\p{Cntrl}\\\\<>].*") || name.contains("\ufffd") || name.contains("://")) return null;
            String web = "https://map.naver.com/p/search/" + encode(name);
            if (!params.containsKey("lat") && !params.containsKey("lon")) {
                if (params.size() != 3) return null;
                return new NaverMapLink("nmap://search?query=" + encode(name) + "&appname=" + applicationId, web);
            }
            if (params.size() != 5 || !params.containsKey("lat") || !params.containsKey("lon")) return null;
            String latText = params.get("lat"), lonText = params.get("lon");
            if (!latText.matches("[0-9]{2}(?:\\.[0-9]{1,12})?") || !lonText.matches("[0-9]{3}(?:\\.[0-9]{1,12})?")) return null;
            double lat = Double.parseDouble(latText), lon = Double.parseDouble(lonText);
            // Disjoint broad envelopes around the existing official directory
            // pins are input bounds, not claims about campus boundaries/access.
            boolean bounded = "yongin".equals(campus)
                ? lat >= 37.20 && lat <= 37.24 && lon >= 127.17 && lon <= 127.21
                : lat >= 37.57 && lat <= 37.59 && lon >= 126.91 && lon <= 126.94;
            if (!bounded) return null;
            return new NaverMapLink("nmap://place?lat=" + latText + "&lng=" + lonText + "&name=" + encode(name) + "&appname=" + applicationId, web);
        } catch (Exception error) { return null; }
    }
}
