import dev.student.myongjiexplorer.standalone.NaverMapLink;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

/** Host-JVM URL policy tests. Does not claim a real installed Naver app or browser. */
public final class NaverMapLinkTest {
    private static int checks;
    private static void check(boolean value, String label) {
        if (!value) throw new AssertionError(label);
        checks++;
    }
    private static String request(String campus, String name, String tail) throws Exception {
        return NaverMapLink.REQUEST + "?campus=" + campus + "&place=" + (campus.equals("seoul") ? "mju-s9" : "mju-y3") + "&name=" + URLEncoder.encode(name, "UTF-8") + tail;
    }
    public static void main(String[] args) throws Exception {
        String y = request("yongin", "명지대학교 자연캠퍼스 명진당", "&lat=37.2221&lon=127.188545");
        String s = request("seoul", "명지대학교 인문캠퍼스 방목학술정보관", "&lat=37.5801&lon=126.9233");
        String search = request("yongin", "명지대학교 자연캠퍼스 테니스장 관리실", "");
        for (String value : new String[] {y, s, search}) {
            NaverMapLink link = NaverMapLink.fromRequest(value);
            check(link != null, "accept supported local request");
            check(link.appUrl.endsWith("&appname=dev.student.myongjiexplorer.standalone"), "standalone package identity");
            check(link.appUrl.startsWith(value.equals(search) ? "nmap://search?" : "nmap://place?"), "only marker/search actions");
            check(link.webUrl.startsWith("https://map.naver.com/p/search/"), "HTTPS fallback");
            check(!link.appUrl.contains("route") && !link.appUrl.contains("slat="), "no route/GPS forwarding");
            check(link.appUrl.equals(NaverMapLink.fromRequest(value).appUrl), "repeatable request");
        }
        check(NaverMapLink.PACKAGE.equals("com.nhn.android.nmap"), "pinned official Android package");
        check(NaverMapLink.fromRequest(y, "dev.publisher.campus").appUrl.endsWith("&appname=dev.publisher.campus"), "uses trusted runtime application ID");
        check(NaverMapLink.fromRequest(y, "dev.publisher&url=evil") == null, "reject malformed app identity");
        String[] rejected = {
            null, "", "nmap://place?lat=37.2221&lng=127.188545", "intent://place#Intent;scheme=nmap;end",
            y.replace("https:", "http:"), y.replace("appassets.androidplatform.net", "evil.example"),
            y.replace("appassets.androidplatform.net", "user@appassets.androidplatform.net"),
            y.replace("appassets.androidplatform.net", "appassets.androidplatform.net:443"),
            y.replace("/native/naver", "/native/naver/"), y + "#fragment", y + "&", y + "&campus=yongin",
            y + "&url=https%3A%2F%2Fevil.example", y + "&appname=other", y + "&slat=37.2221",
            y.replace("campus=yongin", "campus=seoul"), y.replace("campus=yongin", "campus=unknown"),
            y.replace("place=mju-y3", "place=mju-s9"), y.replace("place=mju-y3", "place=mju-y4"),
            y.replace("place=mju-y3", "place=mju-missing"), y.replace("&place=mju-y3", ""),
            y.replace("lat=37.2221", "lat=37.5801"), s.replace("lon=126.9233", "lon=127.188545"),
            y.replace("&lat=37.2221", ""), y.replace("&lon=127.188545", ""),
            y.replace("lat=37.2221", "lat=NaN"), y.replace("lat=37.2221", "lat=Infinity"),
            y.replace("lat=37.2221", "lat=0"), y.replace("lat=37.2221", "lat=3.72221e1"),
            y.replace("lat=37.2221", "lat=37.2221%20"), y.replace("campus=yongin", "campus=%79ongin"),
            request("yongin", "명지대학교 인문캠퍼스 방목학술정보관", ""),
            request("yongin", "명지대학교 자연캠퍼스 ", ""), request("yongin", "명지대학교 자연캠퍼스 x\n", ""),
            request("yongin", "명지대학교 자연캠퍼스 x\u0000x", ""), request("yongin", "명지대학교 자연캠퍼스 https://example.com", ""),
            request("yongin", "명지대학교 자연캠퍼스 x\r\nx", ""),
            request("yongin", "명지대학교 자연캠퍼스 <x>", ""), request("yongin", "명지대학교 자연캠퍼스 \ufffd", "")
        };
        for (String value : rejected) check(NaverMapLink.fromRequest(value) == null, "reject malformed/arbitrary request: " + value);
        if (args.length > 0) {
            for (String line : Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8)) {
                if (line.isEmpty()) continue;
                String[] fields = line.split("\t", -1);
                NaverMapLink link = NaverMapLink.fromRequest(fields[0]);
                check(link != null, "accept actual TypeScript reference request");
                check(new URI(link.webUrl).getPath().equals(new URI(fields[1]).getPath()), "same web search as TypeScript");
                check(link.appUrl.startsWith("nmap://" + (fields[2].equals("marker") ? "place?" : "search?")), "actual reference action");
            }
        }
        System.out.println("Naver map link policy passed: " + checks + " checks (host JVM only)");
    }
}
