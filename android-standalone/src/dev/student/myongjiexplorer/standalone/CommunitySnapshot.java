package dev.student.myongjiexplorer.standalone;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Bounded, dependency-free validation. Validation does not verify source authorship or facts. */
public final class CommunitySnapshot {
    public static final int MAX_BYTES = 256 * 1024;
    private static final long MAX_VERSION = 9007199254740991L;
    private static final long DAY_MS = 86400000L;
    private static final String ACCOUNTS = "o_ulami|mjhs_lounge|mju_lounge|mj_bokji_foodist";
    private static final Pattern DAY = Pattern.compile("([0-9]{4})-([0-9]{2})-([0-9]{2})");
    private static final Pattern TIMESTAMP = Pattern.compile("([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.([0-9]{1,3}))?(Z|([+-])([0-9]{2}):([0-9]{2}))");
    private static final Pattern POST = Pattern.compile("https://www\\.instagram\\.com/(?:(" + ACCOUNTS + ")/)?(p|reel)/[A-Za-z0-9_-]{1,64}/");
    private static final Pattern STORY = Pattern.compile("https://www\\.instagram\\.com/stories/(" + ACCOUNTS + ")/[0-9]{1,32}/");
    private static final Pattern OFFICIAL = Pattern.compile("https://www\\.mju\\.ac\\.kr/diet/mjukr/([456])/view\\.do\\?monday=([0-9]{4})\\.([0-9]{2})\\.([0-9]{2})");
    private static final Pattern EMBEDDED_URL = Pattern.compile("https?://|www\\.|mailto:|tel:|data:|javascript:", Pattern.CASE_INSENSITIVE);
    private static final Pattern EMAIL = Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE = Pattern.compile("\\+?[0-9][0-9 ().-]{7,}[0-9]");
    private static final Pattern CREDENTIAL = Pattern.compile("-----BEGIN|\\b(?:sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{8,}|\\b(?:password|access[_ -]?token|api[_ -]?key)\\s*[:=]", Pattern.CASE_INSENSITIVE);
    private static final String[] ROOT_KEYS = {"schemaVersion", "campusId", "version", "updatedAt", "updates"};
    private static final String[] UPDATE_KEYS = {"id", "sourceId", "kind", "summary", "sourceUrl", "publishedAt", "reviewedAt", "validFrom", "validThrough"};
    private static final String[] LANGUAGES = {"en", "ko", "zh"};

    public final long version;
    public final String updatedAt;
    final long updatedAtMillis;
    /** Sorted object keys; array order is preserved. Escape U+2028/U+2029 at the JavaScript boundary. */
    public final String canonicalJson;

    private CommunitySnapshot(long version, String updatedAt, long updatedAtMillis, String canonicalJson) {
        this.version = version;
        this.updatedAt = updatedAt;
        this.updatedAtMillis = updatedAtMillis;
        this.canonicalJson = canonicalJson;
    }

    /** Returns a new byte array on every call. */
    public byte[] bytes() { return canonicalJson.getBytes(StandardCharsets.UTF_8); }

    /** Same canonical-content validator as the public community server. */
    public String etag() {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(bytes());
            StringBuilder hex = new StringBuilder(64);
            for (byte value : hash) hex.append("0123456789abcdef".charAt((value & 255) >>> 4)).append("0123456789abcdef".charAt(value & 15));
            return "\"community-yongin-v" + version + "-" + hex + "\"";
        } catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable"); }
    }

    public static final class ValidationException extends Exception {
        private static final long serialVersionUID = 1L;
        private ValidationException(String message) { super(message); }
    }

    private static ValidationException invalid(String field, String reason) {
        // Field names are constants/indexes: never include supplied keys, values or parser causes.
        return new ValidationException(field + ": " + reason);
    }

    public static CommunitySnapshot parse(byte[] raw, long now) throws ValidationException {
        if (raw == null || raw.length > MAX_BYTES) throw invalid("input", "expected at most 262144 UTF-8 bytes");
        final String json;
        try {
            json = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(raw)).toString();
        } catch (CharacterCodingException error) { throw invalid("input", "invalid UTF-8"); }
        Map<String, Object> root = exactObject(new Parser(json).parse(), ROOT_KEYS, false, "document");
        if (integer(root.get("schemaVersion"), "schemaVersion") != 1L) throw invalid("schemaVersion", "only version 1 is supported");
        if (!"yongin".equals(root.get("campusId"))) throw invalid("campusId", "only Yongin is supported");
        long version = integer(root.get("version"), "version");
        if (version < 1L || version > MAX_VERSION) throw invalid("version", "expected a positive safe integer");
        String updatedAt = string(root.get("updatedAt"), "updatedAt");
        long updated = timestamp(updatedAt, "updatedAt");
        if (updated > now) throw invalid("updatedAt", "timestamp must not be in the future");
        Object values = root.get("updates");
        if (!(values instanceof List) || ((List<?>) values).size() > 100) throw invalid("updates", "expected an array of at most 100 records");
        Set<String> ids = new HashSet<String>();
        int index = 0;
        for (Object value : (List<?>) values) {
            String field = "updates[" + index++ + "]";
            Map<String, Object> record = exactObject(value, UPDATE_KEYS, true, field);
            String id = string(record.get("id"), field + ".id");
            if (!id.matches("[a-z0-9][a-z0-9_-]{0,79}")) throw invalid(field + ".id", "invalid record ID");
            if (!ids.add(id)) throw invalid(field + ".id", "duplicate ID");
            String source = string(record.get("sourceId"), field + ".sourceId");
            String kind = string(record.get("kind"), field + ".kind");
            int official = officialSource(source);
            boolean account = source.matches(ACCOUNTS);
            if (!account && official == 0) throw invalid(field + ".sourceId", "unknown source");
            if (official != 0 ? !"menu".equals(kind) : !("announcement".equals(kind) || ("menu".equals(kind) && !"o_ulami".equals(source)))) {
                throw invalid(field + ".kind", "unsupported kind for source");
            }
            validateSummary(record.get("summary"), field + ".summary");
            long from = day(record.get("validFrom"), field + ".validFrom");
            long through = day(record.get("validThrough"), field + ".validThrough");
            long days = (through - from) / DAY_MS + 1L;
            if (days < 1L || days > ("menu".equals(kind) ? 7L : 366L)) throw invalid(field, "validity exceeds the permitted inclusive KST days");
            sourceUrl(record.get("sourceUrl"), source, official, from, through, field + ".sourceUrl");
            long reviewed = timestamp(record.get("reviewedAt"), field + ".reviewedAt");
            if (reviewed > now) throw invalid(field + ".reviewedAt", "timestamp must not be in the future");
            if (reviewed > updated) throw invalid("updatedAt", "must be at or after every review");
            Object publishedValue = record.get("publishedAt");
            long published = Long.MIN_VALUE;
            if (publishedValue == null) {
                if (official == 0 || !record.containsKey("observedAt")) throw invalid(field + ".publishedAt", "unknown publication requires an official source and observation timestamp");
            } else {
                published = timestamp(publishedValue, field + ".publishedAt");
                if (published > now || published > reviewed) throw invalid(field + ".publishedAt", "publication must not follow the review or validation time");
            }
            if (record.containsKey("observedAt")) {
                if (official == 0) throw invalid(field + ".observedAt", "observation timestamps are supported only for official sources");
                long observed = timestamp(record.get("observedAt"), field + ".observedAt");
                if (observed < published || observed > now || observed > reviewed) throw invalid(field + ".observedAt", "observation must be at or after publication and not follow the review or validation time");
            }
        }
        // JSON numeric spellings such as 1.0 and 1e0 represent the same permitted integers.
        root.put("schemaVersion", Long.valueOf(1L));
        root.put("version", Long.valueOf(version));
        StringBuilder output = new StringBuilder(json.length());
        canonical(root, output);
        String canonicalJson = output.toString();
        if (canonicalJson.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw invalid("input", "canonical snapshot exceeds byte limit");
        return new CommunitySnapshot(version, updatedAt, updated, canonicalJson);
    }

    private static int officialSource(String source) {
        if ("mju-menu-library".equals(source)) return 4;
        if ("mju-menu-student".equals(source)) return 5;
        if ("mju-menu-dorm".equals(source)) return 6;
        return 0;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> exactObject(Object value, String[] required, boolean observed, String field) throws ValidationException {
        if (!(value instanceof Map)) throw invalid(field, "expected an object");
        Map<String, Object> object = (Map<String, Object>) value;
        Set<String> allowed = new HashSet<String>(Arrays.asList(required));
        if (!object.keySet().containsAll(allowed)) throw invalid(field, "missing or unsupported fields");
        if (observed) allowed.add("observedAt");
        if (!allowed.containsAll(object.keySet())) throw invalid(field, "missing or unsupported fields");
        return object;
    }

    private static String string(Object value, String field) throws ValidationException {
        if (!(value instanceof String)) throw invalid(field, "expected a string");
        return (String) value;
    }

    private static long integer(Object value, String field) throws ValidationException {
        if (!(value instanceof BigDecimal)) throw invalid(field, "expected an integer");
        try { return ((BigDecimal) value).longValueExact(); }
        catch (ArithmeticException error) { throw invalid(field, "expected a safe integer"); }
    }

    private static long calendar(int year, int month, int date, String field) throws ValidationException {
        if (year < 2000 || year > 2099) throw invalid(field, "date outside supported calendar range");
        GregorianCalendar result = new GregorianCalendar(TimeZone.getTimeZone("UTC"));
        result.clear();
        result.setLenient(false);
        result.set(year, month - 1, date);
        try { return result.getTimeInMillis(); }
        catch (IllegalArgumentException error) { throw invalid(field, "invalid calendar date"); }
    }

    private static int part(Matcher match, int group) { return Integer.parseInt(match.group(group)); }

    private static long day(Object value, String field) throws ValidationException {
        Matcher match = DAY.matcher(string(value, field));
        if (!match.matches()) throw invalid(field, "expected YYYY-MM-DD interpreted in Asia/Seoul");
        return calendar(part(match, 1), part(match, 2), part(match, 3), field);
    }

    private static long timestamp(Object value, String field) throws ValidationException {
        Matcher match = TIMESTAMP.matcher(string(value, field));
        if (!match.matches()) throw invalid(field, "expected ISO timestamp with seconds and explicit offset");
        long date = calendar(part(match, 1), part(match, 2), part(match, 3), field);
        int hour = part(match, 4), minute = part(match, 5), second = part(match, 6);
        if (hour > 23 || minute > 59 || second > 59) throw invalid(field, "invalid clock time");
        int fraction = 0;
        if (match.group(7) != null) fraction = Integer.parseInt((match.group(7) + "00").substring(0, 3));
        int offset = 0;
        if (!"Z".equals(match.group(8))) {
            int offsetHour = part(match, 10), offsetMinute = part(match, 11);
            if (offsetHour > 14 || offsetMinute > 59 || (offsetHour == 14 && offsetMinute != 0)) throw invalid(field, "invalid time-zone offset");
            offset = (offsetHour * 60 + offsetMinute) * ("-".equals(match.group(9)) ? -1 : 1);
        }
        return date + hour * 3600000L + minute * 60000L + second * 1000L + fraction - offset * 60000L;
    }

    private static void sourceUrl(Object value, String source, int official, long from, long through, String field) throws ValidationException {
        String url = string(value, field);
        if (url.length() > 200) throw invalid(field, "URL exceeds length limit");
        if (official != 0) {
            Matcher match = OFFICIAL.matcher(url);
            if (!match.matches() || part(match, 1) != official) throw invalid(field, "expected the exact official menu URL for this source");
            long monday = calendar(part(match, 2), part(match, 3), part(match, 4), field);
            GregorianCalendar date = new GregorianCalendar(TimeZone.getTimeZone("UTC"));
            date.setTimeInMillis(monday);
            if (date.get(Calendar.DAY_OF_WEEK) != Calendar.MONDAY || from < monday || through > monday + 6L * DAY_MS) throw invalid(field, "URL week must start on Monday and contain the validity dates");
            return;
        }
        Matcher match = STORY.matcher(url);
        if (match.matches()) {
            if (!source.equals(match.group(1))) throw invalid(field, "source account differs from Story account");
            return;
        }
        match = POST.matcher(url);
        if (!match.matches() || (match.group(1) != null && !source.equals(match.group(1)))) throw invalid(field, "expected a canonical post, reel or matching account Story URL");
    }

    private static boolean trimSpace(int codepoint) {
        return codepoint == 0x20 || (codepoint >= 0x09 && codepoint <= 0x0d) || codepoint == 0xa0 || codepoint == 0x1680 ||
            (codepoint >= 0x2000 && codepoint <= 0x200a) || codepoint == 0x2028 || codepoint == 0x2029 || codepoint == 0x202f ||
            codepoint == 0x205f || codepoint == 0x3000 || codepoint == 0xfeff;
    }

    private static void validateSummary(Object value, String field) throws ValidationException {
        Map<String, Object> summary = exactObject(value, LANGUAGES, false, field);
        for (String language : LANGUAGES) {
            String key = field + "." + language;
            String text = string(summary.get(language), key);
            if (text.isEmpty() || trimSpace(text.codePointAt(0)) || trimSpace(text.codePointBefore(text.length()))) throw invalid(key, "expected nonempty trimmed plain text");
            if (text.codePointCount(0, text.length()) > 400 || text.getBytes(StandardCharsets.UTF_8).length > 2000) throw invalid(key, "summary exceeds length limit");
            for (int i = 0; i < text.length();) {
                int codepoint = text.codePointAt(i);
                if (codepoint == '<' || codepoint == '>' || codepoint < 0x20 || (codepoint >= 0x7f && codepoint <= 0x9f) || (codepoint >= 0xd800 && codepoint <= 0xdfff)) throw invalid(key, "HTML, controls or invalid Unicode are not allowed");
                i += Character.charCount(codepoint);
            }
            if (EMBEDDED_URL.matcher(text).find() || EMAIL.matcher(text).find()) throw invalid(key, "embedded URLs and contact details are not allowed");
            Matcher phone = PHONE.matcher(text);
            while (phone.find()) {
                int digits = 0;
                for (int i = phone.start(); i < phone.end(); i++) if (text.charAt(i) >= '0' && text.charAt(i) <= '9') digits++;
                if (digits >= 10) throw invalid(key, "possible personal phone number");
            }
            if (CREDENTIAL.matcher(text).find()) throw invalid(key, "possible credential");
        }
    }

    @SuppressWarnings("unchecked")
    private static void canonical(Object value, StringBuilder out) {
        if (value == null) { out.append("null"); return; }
        if (value instanceof String) { quote((String) value, out); return; }
        if (value instanceof Map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> entry : new TreeMap<String, Object>((Map<String, Object>) value).entrySet()) {
                if (!first) out.append(',');
                first = false;
                quote(entry.getKey(), out);
                out.append(':');
                canonical(entry.getValue(), out);
            }
            out.append('}');
        } else if (value instanceof List) {
            out.append('[');
            boolean first = true;
            for (Object entry : (List<?>) value) {
                if (!first) out.append(',');
                first = false;
                canonical(entry, out);
            }
            out.append(']');
        } else { out.append(value); }
    }

    private static void quote(String text, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"' || c == '\\') out.append('\\').append(c);
            else if (c < 0x20) {
                out.append("\\u");
                for (int shift = 12; shift >= 0; shift -= 4) out.append("0123456789abcdef".charAt((c >> shift) & 15));
            } else out.append(c);
        }
        out.append('"');
    }

    /** Limited JSON grammar, not JavaScript: rejects duplicate keys and unpaired surrogates. */
    private static final class Parser {
        private final String input;
        private int position;
        private int nodes;
        Parser(String input) { this.input = input; }

        Object parse() throws ValidationException {
            Object result = value(0);
            whitespace();
            if (position != input.length()) throw bad();
            return result;
        }

        private ValidationException bad() { return invalid("input", "invalid or unsupported JSON at character " + position); }

        private void whitespace() {
            while (position < input.length()) {
                char c = input.charAt(position);
                if (c != ' ' && c != '\t' && c != '\r' && c != '\n') break;
                position++;
            }
        }

        private boolean take(char c) {
            if (position < input.length() && input.charAt(position) == c) { position++; return true; }
            return false;
        }

        private Object value(int depth) throws ValidationException {
            whitespace();
            if (++nodes > 10000 || position >= input.length()) throw bad();
            char c = input.charAt(position);
            if (c == '"') return text();
            if (c == '{' || c == '[') {
                if (depth >= 16) throw invalid("input", "JSON nesting exceeds 16 levels");
                position++;
                whitespace();
                if (c == '{') {
                    Map<String, Object> result = new LinkedHashMap<String, Object>();
                    if (take('}')) return result;
                    do {
                        whitespace();
                        if (position >= input.length() || input.charAt(position) != '"') throw bad();
                        String key = text();
                        if (result.containsKey(key)) throw invalid("input", "duplicate object key");
                        whitespace();
                        if (!take(':')) throw bad();
                        result.put(key, value(depth + 1));
                        whitespace();
                        if (take('}')) return result;
                    } while (take(','));
                } else {
                    List<Object> result = new ArrayList<Object>();
                    if (take(']')) return result;
                    do {
                        result.add(value(depth + 1));
                        whitespace();
                        if (take(']')) return result;
                    } while (take(','));
                }
                throw bad();
            }
            if (input.startsWith("true", position)) { position += 4; return Boolean.TRUE; }
            if (input.startsWith("false", position)) { position += 5; return Boolean.FALSE; }
            if (input.startsWith("null", position)) { position += 4; return null; }
            int start = position;
            take('-');
            if (!take('0')) {
                if (position >= input.length() || input.charAt(position) < '1' || input.charAt(position) > '9') throw bad();
                digits();
            }
            if (take('.')) { int before = position; digits(); if (before == position) throw bad(); }
            if (take('e') || take('E')) {
                if (!take('+')) take('-');
                int before = position;
                digits();
                if (before == position) throw bad();
            }
            if (position - start > 128) throw invalid("input", "numeric token exceeds limit");
            try { return new BigDecimal(input.substring(start, position)); }
            catch (NumberFormatException error) { throw bad(); }
        }

        private void digits() {
            while (position < input.length() && input.charAt(position) >= '0' && input.charAt(position) <= '9') position++;
        }

        private String text() throws ValidationException {
            position++;
            StringBuilder result = new StringBuilder();
            while (position < input.length()) {
                char c = input.charAt(position++);
                if (c == '"') {
                    for (int i = 0; i < result.length(); i++) {
                        char item = result.charAt(i);
                        if (Character.isHighSurrogate(item)) {
                            if (++i >= result.length() || !Character.isLowSurrogate(result.charAt(i))) throw bad();
                        } else if (Character.isLowSurrogate(item)) throw bad();
                    }
                    return result.toString();
                }
                if (c < 0x20) throw bad();
                if (c == '\\') {
                    if (position >= input.length()) throw bad();
                    char escape = input.charAt(position++);
                    switch (escape) {
                        case '"': case '\\': case '/': c = escape; break;
                        case 'b': c = '\b'; break;
                        case 'f': c = '\f'; break;
                        case 'n': c = '\n'; break;
                        case 'r': c = '\r'; break;
                        case 't': c = '\t'; break;
                        case 'u':
                            if (input.length() - position < 4) throw bad();
                            int code = 0;
                            for (int i = 0; i < 4; i++) {
                                char digit = input.charAt(position++);
                                int n = digit >= '0' && digit <= '9' ? digit - '0' : digit >= 'a' && digit <= 'f' ? digit - 'a' + 10 : digit >= 'A' && digit <= 'F' ? digit - 'A' + 10 : -1;
                                if (n < 0) throw bad();
                                code = (code << 4) | n;
                            }
                            c = (char) code;
                            break;
                        default: throw bad();
                    }
                }
                result.append(c);
            }
            throw bad();
        }
    }
}
