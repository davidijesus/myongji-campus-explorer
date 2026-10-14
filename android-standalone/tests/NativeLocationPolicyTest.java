import dev.student.myongjiexplorer.standalone.MainActivity;
import java.lang.reflect.Method;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/** Host-JVM security policy checks only; does not simulate Android permissions or GPS. */
public final class NativeLocationPolicyTest {
    private static final String ANDROID = "http://schemas.android.com/apk/res/android";
    private static int checks;

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
        checks++;
    }

    private static void checkManifest(Path path) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        Document document = factory.newDocumentBuilder().parse(path.toFile());
        NodeList nodes = document.getElementsByTagName("uses-permission");
        Set<String> permissions = new HashSet<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            permissions.add(((Element) nodes.item(i)).getAttributeNS(ANDROID, "name"));
        }
        check(permissions.equals(new HashSet<>(Arrays.asList(
            "android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION", "android.permission.INTERNET"))),
            path + ": only optional foreground location and manual content Internet permissions are allowed");
        nodes = document.getElementsByTagName("uses-feature");
        Set<String> features = new HashSet<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            Element element = (Element) nodes.item(i);
            String name = element.getAttributeNS(ANDROID, "name");
            if (name.startsWith("android.hardware.location")) {
                check("false".equals(element.getAttributeNS(ANDROID, "required")), name + " must remain optional");
                features.add(name);
            }
        }
        check(features.containsAll(Arrays.asList("android.hardware.location", "android.hardware.location.gps",
            "android.hardware.location.network")), path + ": location-less devices remain supported");
    }

    public static void main(String[] args) throws Exception {
        Method allows = MainActivity.class.getDeclaredMethod("isLocalLocationOrigin", String.class);
        allows.setAccessible(true);
        String origin = "https://appassets.androidplatform.net";
        for (String value : new String[] { origin, origin + "/" }) {
            check(Boolean.TRUE.equals(allows.invoke(null, value)), "Allow the local secure origin: " + value);
        }
        for (String value : new String[] { null, "", "null", "http://appassets.androidplatform.net",
            "https://appassets.androidplatform.net.evil.example", "https://evil.example",
            "https://appassets.androidplatform.net@evil.example", "https://user@appassets.androidplatform.net",
            origin + ":443", origin + ":8443", origin + "/assets/index.html", origin + "//",
            origin + "?origin=local", origin + "#local", " " + origin, origin + " ",
            "file:///android_asset/index.html", "content://appassets.androidplatform.net", "about:blank" }) {
            check(Boolean.FALSE.equals(allows.invoke(null, value)), "Deny noncanonical/untrusted origin: " + value);
        }
        Path root = Paths.get(args.length == 0 ? "." : args[0]);
        checkManifest(root.resolve("android-standalone/AndroidManifest.xml"));
        checkManifest(root.resolve("android-standalone/publisher/AndroidManifest.xml"));
        System.out.println(checks + " native location origin/manifest checks passed; Android runtime and GPS not exercised");
    }
}
