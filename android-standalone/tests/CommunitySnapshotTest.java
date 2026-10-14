package dev.student.myongjiexplorer.standalone;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;

/** Run with plain javac/java; no Android, JSON library, network or credentials. */
public final class CommunitySnapshotTest {
    private static final long NOW = 1791115200000L; // 2026-10-04T12:00:00Z
    private static int checks;
    private static final String SUMMARY = "{\"en\":\"Reviewed campus menu.\",\"ko\":\"검토된 교내 식단.\",\"zh\":\"已审核的校园菜单。\"}";
    private static final String RECORD = "{\"id\":\"menu-1\",\"sourceId\":\"mjhs_lounge\",\"kind\":\"menu\",\"summary\":" + SUMMARY + ",\"sourceUrl\":\"https://www.instagram.com/mjhs_lounge/p/AbC_123-x/\",\"publishedAt\":\"2026-10-01T09:00:00+09:00\",\"reviewedAt\":\"2026-10-02T12:00:00Z\",\"validFrom\":\"2026-09-28\",\"validThrough\":\"2026-10-04\"}";

    private static String snapshot(String records) {
        return "{\"schemaVersion\":1,\"campusId\":\"yongin\",\"version\":1,\"updatedAt\":\"2026-10-03T12:00:00Z\",\"updates\":[" + records + "]}";
    }

    private static CommunitySnapshot good(String json) throws Exception {
        CommunitySnapshot result = CommunitySnapshot.parse(json.getBytes(StandardCharsets.UTF_8), NOW);
        checks++;
        return result;
    }

    private static void bad(String label, String json) throws Exception { badBytes(label, json.getBytes(StandardCharsets.UTF_8)); }

    private static void badBytes(String label, byte[] bytes) throws Exception {
        try { CommunitySnapshot.parse(bytes, NOW); }
        catch (CommunitySnapshot.ValidationException expected) {
            if (expected.getCause() != null) throw new AssertionError("Untrusted parser cause retained: " + label);
            if (expected.getMessage().contains("SECRET_SENTINEL") || expected.getMessage().contains("37.123456")) throw new AssertionError("Input data exposed: " + label);
            checks++;
            return;
        }
        throw new AssertionError("Accepted invalid input: " + label);
    }

    private static void expect(boolean condition, String label) {
        checks++;
        if (!condition) throw new AssertionError(label);
    }

    private static String official(String source, String number) {
        return RECORD.replace("mjhs_lounge", source)
            .replace("https://www.instagram.com/" + source + "/p/AbC_123-x/", "https://www.mju.ac.kr/diet/mjukr/" + number + "/view.do?monday=2026.09.28")
            .replace("\"publishedAt\":\"2026-10-01T09:00:00+09:00\"", "\"publishedAt\":null,\"observedAt\":\"2026-10-01T12:00:00Z\"");
    }

    private static String repeat(String text, int count) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < count; i++) result.append(text);
        return result.toString();
    }

    public static void main(String[] args) throws Exception {
        CommunitySnapshot empty = good(snapshot(""));
        expect(empty.version == 1L && empty.updatedAt.equals("2026-10-03T12:00:00Z"), "Public metadata");
        expect(empty.canonicalJson.equals("{\"campusId\":\"yongin\",\"schemaVersion\":1,\"updatedAt\":\"2026-10-03T12:00:00Z\",\"updates\":[],\"version\":1}"), "Sorted canonical root");
        CommunitySnapshot valid = good(snapshot(RECORD));
        expect(valid.canonicalJson.contains("\"summary\":{\"en\":\"Reviewed campus menu.\",\"ko\":"), "Recursively sorted keys");
        expect(good(valid.canonicalJson).canonicalJson.equals(valid.canonicalJson), "Canonical representation is idempotent");
        byte[] firstBytes = valid.bytes();
        firstBytes[0] = '!';
        expect(valid.bytes()[0] == '{', "Bytes are defensive copies");
        expect(new String(valid.bytes(), StandardCharsets.UTF_8).equals(valid.canonicalJson), "Canonical UTF-8 bytes");
        String reordered = " {\n \"updates\":[],\"updatedAt\":\"2026-10-03T12:00:00Z\",\"version\":1e0,\"campusId\":\"yongin\",\"schemaVersion\":1.0 } \r\n";
        expect(good(reordered).canonicalJson.equals(empty.canonicalJson), "Whitespace, order and numeric spelling canonicalize identically");
        expect(good(snapshot(RECORD.replace("Reviewed campus menu.", "Meals & news\u2028today\u2029here"))).canonicalJson.contains("Meals & news\u2028today\u2029here"), "Canonical JSON preserves valid Unicode; emitter handles JavaScript escapes");
        good(snapshot(RECORD.replace("Reviewed campus menu.", "Quote: \\\"hello\\\" and \\\\ path")));
        good(snapshot(RECORD.replace("Reviewed campus menu.", "Food " + new String(Character.toChars(0x1f35a)))));
        good(snapshot(RECORD.replace("Reviewed campus menu.", "Food \\ud83c\\udf5a")));
        good(snapshot(RECORD.replace("Reviewed campus menu.", repeat("食", 400))));
        good(snapshot(RECORD.replace("Reviewed campus menu.", repeat(new String(Character.toChars(0x1f35a)), 400))));
        bad("401 codepoints", snapshot(RECORD.replace("Reviewed campus menu.", repeat("食", 401))));
        for (String version : new String[]{"0", "-1", "1.5", "9007199254740992", "9223372036854775808", "1e2000000000", "\"1\"", "true", "null"}) bad("Version bounds", snapshot("").replace("\"version\":1", "\"version\":" + version));
        expect(good(snapshot("").replace("\"version\":1", "\"version\":9007199254740991")).version == 9007199254740991L, "Largest safe version");
        bad("Unsupported schema", snapshot("").replace("\"schemaVersion\":1", "\"schemaVersion\":2"));
        bad("Other campus", snapshot("").replace("yongin", "seoul"));
        bad("Non-object root", "[]");
        bad("Unknown root field", snapshot("").replace("\"updates\":[]", "\"updates\":[],\"SECRET_SENTINEL\":37.123456"));
        bad("Missing root field", snapshot("").replace("\"version\":1,", ""));
        bad("Non-array updates", snapshot("").replace("\"updates\":[]", "\"updates\":{}"));
        bad("Null record", snapshot("null"));
        bad("Extra record field", snapshot(RECORD.replace("\"id\":", "\"rawCoordinates\":\"37.123456\",\"id\":")));
        bad("Missing published field", snapshot(RECORD.replace("\"publishedAt\":\"2026-10-01T09:00:00+09:00\",", "")));
        bad("Duplicate update IDs", snapshot(RECORD + "," + RECORD));
        StringBuilder hundred = new StringBuilder();
        for (int i = 0; i < 100; i++) { if (i != 0) hundred.append(','); hundred.append(RECORD.replace("menu-1", "menu-" + i)); }
        good(snapshot(hundred.toString()));
        String largeAmpersandSnapshot = snapshot(hundred.toString()).replace("Reviewed campus menu.", repeat("&", 400)).replace("검토된 교내 식단.", repeat("&", 400)).replace("已审核的校园菜单。", repeat("&", 400));
        CommunitySnapshot large = good(largeAmpersandSnapshot);
        expect(large.bytes().length < CommunitySnapshot.MAX_BYTES, "Valid text is not inflated by HTML escaping in cache");
        expect(good(large.canonicalJson).canonicalJson.equals(large.canonicalJson), "Large canonical snapshot remains reloadable");
        bad("101 records", snapshot(hundred + "," + RECORD.replace("menu-1", "menu-extra")));
        for (String id : new String[]{"", "Menu", "-bad", "two words", repeat("a", 81)}) bad("Record ID syntax", snapshot(RECORD.replace("menu-1", id)));
        good(snapshot(RECORD.replace("menu-1", repeat("a", 80))));

        for (String account : new String[]{"o_ulami", "mjhs_lounge", "mju_lounge", "mj_bokji_foodist"}) {
            String record = RECORD.replace("mjhs_lounge", account).replace("\"kind\":\"menu\"", "\"kind\":\"announcement\"");
            good(snapshot(record));
            good(snapshot(record.replace(account + "/p/AbC_123-x/", "p/AbC_123-x/")));
            good(snapshot(record.replace("/p/AbC_123-x/", "/reel/A/")));
            good(snapshot(record.replace(account + "/p/AbC_123-x/", "stories/" + account + "/12345678901234567890123456789012/")));
        }
        bad("International source cannot supply menus", snapshot(RECORD.replace("mjhs_lounge", "o_ulami")));
        bad("Unknown source", snapshot(RECORD.replace("mjhs_lounge", "unknown_account")));
        bad("Unsupported kind", snapshot(RECORD.replace("\"kind\":\"menu\"", "\"kind\":\"event\"")));
        for (String url : new String[]{
            "https://instagram.com/p/A/", "https://www.instagram.com/p/A", "HTTPS://www.instagram.com/p/A/",
            "https://www.instagram.com/p/A/?tracking=1", "https://www.instagram.com/p/A/#fragment", "https://www.instagram.com:443/p/A/",
            "https://www.instagram.com.evil.example/p/A/", "https://SECRET_SENTINEL@www.instagram.com/p/A/", "http://www.instagram.com/p/A/",
            "https://www.instagram.com/mju_lounge/p/A/", "https://www.instagram.com/stories/mju_lounge/123/",
            "https://www.instagram.com/stories/mjhs_lounge/123456789012345678901234567890123/", "https://www.instagram.com/stories/mjhs_lounge/A/",
            "https://www.instagram.com/mjhs_lounge/", "https://www.instagram.com/p/" + repeat("a", 65) + "/",
            "https://www.instagram.com/p/%41/", "https://www.instagram.com/p/A/embed/", "javascript:SECRET_SENTINEL", "data:text/plain,SECRET_SENTINEL"
        }) bad("Instagram URL constraints", snapshot(RECORD.replace("https://www.instagram.com/mjhs_lounge/p/AbC_123-x/", url)));
        good(snapshot(RECORD.replace("/p/AbC_123-x/", "/p/" + repeat("a", 64) + "/")));
        String library = official("mju-menu-library", "4");
        good(snapshot(library));
        good(snapshot(official("mju-menu-student", "5")));
        good(snapshot(official("mju-menu-dorm", "6")));
        good(snapshot(library.replace("\"publishedAt\":null", "\"publishedAt\":\"2026-09-30T12:00:00Z\"")));
        good(snapshot(library.replace("\"publishedAt\":null,\"observedAt\":\"2026-10-01T12:00:00Z\"", "\"publishedAt\":\"2026-09-30T12:00:00Z\"")));
        bad("Official wrong kind", snapshot(library.replace("\"kind\":\"menu\"", "\"kind\":\"announcement\"")));
        bad("Official wrong venue", snapshot(library.replace("/4/view", "/5/view")));
        bad("Official not Monday", snapshot(library.replace("monday=2026.09.28", "monday=2026.09.29")));
        bad("Official invalid date", snapshot(library.replace("monday=2026.09.28", "monday=2026.02.30")));
        bad("Official different week", snapshot(library.replace("monday=2026.09.28", "monday=2026.09.21")));
        bad("Official dates before week", snapshot(library.replace("\"validFrom\":\"2026-09-28\",\"validThrough\":\"2026-10-04\"", "\"validFrom\":\"2026-09-27\",\"validThrough\":\"2026-09-28\"")));
        bad("Official dates after week", snapshot(library.replace("\"validFrom\":\"2026-09-28\",\"validThrough\":\"2026-10-04\"", "\"validFrom\":\"2026-10-04\",\"validThrough\":\"2026-10-05\"")));
        for (String urlSuffix : new String[]{"&extra=1", "#fragment", "/", "&monday=2026.09.28"}) bad("Exact official URL", snapshot(library.replace("monday=2026.09.28", "monday=2026.09.28" + urlSuffix)));
        bad("Official must use www", snapshot(library.replace("www.mju.ac.kr", "mju.ac.kr")));
        bad("Official cannot use Instagram", snapshot(library.replace("https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28", "https://www.instagram.com/p/A/")));
        bad("IG cannot use official URL", snapshot(RECORD.replace("https://www.instagram.com/mjhs_lounge/p/AbC_123-x/", "https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28")));
        bad("IG requires publication", snapshot(RECORD.replace("\"publishedAt\":\"2026-10-01T09:00:00+09:00\"", "\"publishedAt\":null")));
        bad("IG forbids observation", snapshot(RECORD.replace("\"publishedAt\":", "\"observedAt\":\"2026-10-01T12:00:00Z\",\"publishedAt\":")));
        bad("Unknown publication requires observation", snapshot(library.replace(",\"observedAt\":\"2026-10-01T12:00:00Z\"", "")));
        bad("Null observation", snapshot(library.replace("\"observedAt\":\"2026-10-01T12:00:00Z\"", "\"observedAt\":null")));
        bad("Observation before publication", snapshot(library.replace("\"publishedAt\":null", "\"publishedAt\":\"2026-10-02T00:00:00Z\"")));
        bad("Observation after review", snapshot(library.replace("\"observedAt\":\"2026-10-01T12:00:00Z\"", "\"observedAt\":\"2026-10-02T12:00:00.001Z\"")));
        bad("Future observation", snapshot(library.replace("\"observedAt\":\"2026-10-01T12:00:00Z\"", "\"observedAt\":\"2026-10-05T00:00:00Z\"")));

        String published = "2026-10-01T09:00:00+09:00";
        for (String timestamp : new String[]{"2026-10-01", "2026-10-01T09:00:00", "2026-10-01T09:00Z", "2026-10-01t09:00:00z", "2026-02-30T09:00:00Z", "2026-10-01T24:00:00Z", "2026-10-01T09:60:00Z", "2026-10-01T09:00:60Z", "2026-10-01T09:00:00+14:01", "2026-10-01T09:00:00-15:00", "2026-10-01T09:00:00+01:60", "2026-10-01T09:00:00.1234Z", "1999-12-31T23:59:59Z", "2100-01-01T00:00:00Z"}) bad("Strict timestamp", snapshot(RECORD.replace(published, timestamp)));
        for (String timestamp : new String[]{"2026-10-01T09:00:00Z", "2026-10-01T09:00:00.1Z", "2026-10-01T09:00:00.12Z", "2026-10-01T09:00:00.123Z", "2026-10-01T09:00:00+14:00", "2026-10-01T09:00:00-14:00", "2000-02-29T12:00:00Z"}) good(snapshot(RECORD.replace(published, timestamp)));
        good(snapshot(RECORD.replace(published, "2026-10-02T21:00:00+09:00")));
        bad("Offset publication after review", snapshot(RECORD.replace(published, "2026-10-02T21:00:00.001+09:00")));
        bad("Future publication", snapshot(RECORD.replace(published, "2026-10-05T00:00:00Z")));
        bad("Future review", snapshot(RECORD.replace("2026-10-02T12:00:00Z", "2026-10-05T00:00:00Z")));
        bad("Future snapshot", snapshot("").replace("2026-10-03T12:00:00Z", "2026-10-04T12:00:00.001Z"));
        good(snapshot("").replace("2026-10-03T12:00:00Z", "2026-10-04T12:00:00Z"));
        bad("Snapshot before review", snapshot(RECORD).replace("\"updatedAt\":\"2026-10-03T12:00:00Z\"", "\"updatedAt\":\"2026-10-02T11:59:59.999Z\""));
        good(snapshot(RECORD).replace("\"updatedAt\":\"2026-10-03T12:00:00Z\"", "\"updatedAt\":\"2026-10-02T12:00:00Z\""));
        bad("Reversed validity", snapshot(RECORD.replace("\"validFrom\":\"2026-09-28\"", "\"validFrom\":\"2026-10-05\"")));
        good(snapshot(RECORD.replace("\"validFrom\":\"2026-09-28\"", "\"validFrom\":\"2026-10-04\"")));
        bad("Eight day menu", snapshot(RECORD.replace("\"validThrough\":\"2026-10-04\"", "\"validThrough\":\"2026-10-05\"")));
        String announcement = RECORD.replace("\"kind\":\"menu\"", "\"kind\":\"announcement\"").replace("\"validFrom\":\"2026-09-28\",\"validThrough\":\"2026-10-04\"", "\"validFrom\":\"2024-01-01\",\"validThrough\":\"2024-12-31\"");
        good(snapshot(announcement));
        bad("367 day announcement", snapshot(announcement.replace("2024-12-31", "2025-01-01")));
        good(snapshot(RECORD.replace("2026-09-28", "2000-02-29").replace("2026-10-04", "2000-02-29")));
        for (String date : new String[]{"1999-12-31", "2100-01-01", "2026-02-29", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", "2026-01-01Z"}) bad("Strict validity day", snapshot(RECORD.replace("2026-09-28", date)));

        for (String text : new String[]{"", " ", " leading", "trailing ", "\u00a0leading", "trailing\u3000", "\ufeffleading", "<b>Menu</b>", "Menu\\nnext", "Menu\\u0000next", "Menu\\u007fnext", "Menu\\u0085next", "Read https://example.test", "Read WWW.example.test", "MAILTO:a@example.test", "tel:0123", "data:text/plain", "JAVASCRIPT:alert(1)", "person@example.test", "+82 10-1234-5678", "Call (010) 1234 5678", "password: SECRET_SENTINEL", "Access Token = SECRET_SENTINEL", "api_key: SECRET_SENTINEL", "ghp_abcdefghijk", "sk-abcdefghijk", "AKIA1234567890", "-----BEGIN PRIVATE KEY-----"}) bad("Plain text constraints", snapshot(RECORD.replace("Reviewed campus menu.", text)));
        bad("Missing translation", snapshot(RECORD.replace(",\"zh\":\"已审核的校园菜单。\"", "")));
        bad("Extra translation", snapshot(RECORD.replace("\"summary\":{", "\"summary\":{\"de\":\"Text\",")));
        bad("Null translation", snapshot(RECORD.replace("\"en\":\"Reviewed campus menu.\"", "\"en\":null")));

        for (String json : new String[]{"", " ", "null", "{} {}", snapshot("") + "SECRET_SENTINEL", "/*comment*/" + snapshot(""), "\ufeff" + snapshot(""), snapshot("").replace("\"version\":1", "\"version\":01"), snapshot("").replace("\"version\":1", "\"version\":+1"), snapshot("").replace("\"version\":1", "\"version\":1."), snapshot("").replace("\"version\":1", "\"version\":1e"), snapshot("").replace("\"version\":1", "\"version\":NaN"), snapshot("").replace("\"version\":1", "\"version\":Infinity"), snapshot("").replace("\"version\":1", "\"version\":1e999999999999999999"), snapshot("").replace("\"updates\":[]", "\"updates\":[,]"), snapshot("").replace("\"updates\":[]", "\"updates\":[],"), snapshot(RECORD + ","), snapshot(RECORD.replace("Reviewed campus menu.", "Raw\nnewline")), snapshot(RECORD.replace("Reviewed campus menu.", "bad\\x20escape")), snapshot(RECORD.replace("Reviewed campus menu.", "bad\\uXXXXescape")), snapshot(RECORD.replace("Reviewed campus menu.", "bad\\ud800")), snapshot(RECORD.replace("Reviewed campus menu.", "bad\\udc00")), snapshot(RECORD.replace("Reviewed campus menu.", "bad\\ud800a"))}) bad("Strict JSON grammar", json);
        bad("Duplicate root key", snapshot("").replace("\"version\":1", "\"version\":1,\"version\":1"));
        bad("Escaped duplicate key", snapshot("").replace("\"version\":1", "\"version\":1,\"versi\\u006fn\":1"));
        bad("Duplicate record key", snapshot(RECORD.replace("\"id\":\"menu-1\"", "\"id\":\"menu-1\",\"id\":\"menu-2\"")));
        bad("Duplicate translation", snapshot(RECORD.replace("\"summary\":{", "\"summary\":{\"en\":\"SECRET_SENTINEL\",")));
        bad("Nesting bound", repeat("[", 17) + "null" + repeat("]", 17));
        bad("Token bound", "[" + repeat("null,", 10001) + "null]");
        bad("Numeric token bound", snapshot("").replace("\"version\":1", "\"version\":" + repeat("1", 129)));
        badBytes("Null input", null);
        badBytes("Oversized input", new byte[CommunitySnapshot.MAX_BYTES + 1]);
        for (byte[] malformed : new byte[][]{{(byte) 0xc3, 0x28}, {(byte) 0xc0, (byte) 0xaf}, {(byte) 0xed, (byte) 0xa0, (byte) 0x80}, {(byte) 0xf4, (byte) 0x90, (byte) 0x80, (byte) 0x80}, {(byte) 0xe2, (byte) 0x82}}) badBytes("Malformed UTF-8", malformed);
        byte[] padded = new byte[CommunitySnapshot.MAX_BYTES];
        Arrays.fill(padded, (byte) ' ');
        byte[] emptyBytes = snapshot("").getBytes(StandardCharsets.UTF_8);
        System.arraycopy(emptyBytes, 0, padded, 0, emptyBytes.length);
        expect(CommunitySnapshot.parse(padded, NOW).version == 1L, "Exactly 256 KiB accepted when valid");
        Path fixture = Paths.get(args.length == 0 ? "docs/v055-validation/community-interop" : args[0]);
        byte[] importedBytes = Files.readAllBytes(fixture.resolve("imported.snapshot.json"));
        byte[] canonicalBytes = Files.readAllBytes(fixture.resolve("canonical.snapshot.json"));
        CommunitySnapshot imported = CommunitySnapshot.parse(importedBytes, 1791244800000L);
        CommunitySnapshot canonical = CommunitySnapshot.parse(canonicalBytes, 1791244800000L);
        expect(Arrays.equals(imported.bytes(), canonicalBytes), "Node importer to Java canonical bytes match golden server output");
        expect(imported.canonicalJson.equals(canonical.canonicalJson), "Server canonical and importer snapshot interoperate");
        expect(imported.etag().equals("\"community-yongin-v2-8d8c556af34e12fc917a2abf2da8a70f85b9f3b9fee2f1e9427a713a5111707e\""), "Golden Unicode snapshot content ETag matches server");
        System.out.println(checks + " community snapshot JVM checks passed");
    }
}
