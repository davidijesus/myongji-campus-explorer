package dev.student.myongjiexplorer.standalone;

import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/** Mirrors the reviewed HTTPS rules in mobile/linkPolicy.ts; no arbitrary intents. */
public final class ExternalLinkPolicy {
    private ExternalLinkPolicy() {}
    public static boolean allows(String value) {
        try {
            URI u = new URI(value);
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getRawUserInfo() != null ||
                (u.getPort() != -1 && u.getPort() != 443) || u.getHost() == null) return false;
            String host = u.getHost().toLowerCase(java.util.Locale.ROOT);
            String path = u.getRawPath(), query = u.getRawQuery();
            if ("mju.ac.kr".equals(host) || host.endsWith(".mju.ac.kr")) return true;
            if ("app.notion.com".equals(host)) return "/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505".equals(path) && query == null;
            if ("memory.library.kr".equals(host)) return "/files/original/f962a9ceb37087ac01a6564c77847219.pdf".equals(path) && query == null;
            if ("www.youtube.com".equals(host) && "/watch".equals(path) && query != null) {
                Map<String,String> params = new HashMap<>();
                for (String pair : query.split("&")) {
                    String[] bits = pair.split("=", 2);
                    String key = URLDecoder.decode(bits[0], "UTF-8");
                    if ((!"v".equals(key) && !"t".equals(key)) || params.containsKey(key)) return false;
                    params.put(key, bits.length == 2 ? URLDecoder.decode(bits[1], "UTF-8") : "");
                }
                return "u-JLFts2Pxc".equals(params.get("v")) && (!params.containsKey("t") || params.get("t").matches("[0-9]+s?"));
            }
            if ("www.gansam.com".equals(host)) return ("/works/work.php".equals(path) && "code=works&idx=2527".equals(query)) || ("/admin/data/bbs/works/2105110910094_5.jpg".equals(path) && query == null);
            if ("www.google.com".equals(host)) return "/maps".equals(path) || path.startsWith("/maps/");
            return "maps.app.goo.gl".equals(host) || "map.naver.com".equals(host) || "naver.me".equals(host) || "maps.google.com".equals(host) || "apps.apple.com".equals(host) || "play.google.com".equals(host);
        } catch (Exception error) { return false; }
    }
}
