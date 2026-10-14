import dev.student.myongjiexplorer.standalone.ExternalLinkPolicy;
public final class ExternalLinkPolicyTest {
    public static void main(String[] args) {
        String[] accepted = {"https://mostadmired.tistory.com/231", "https://blog.naver.com/govlrodtnr/223423515444", "https://www.mju.ac.kr/mjukr/index.do", "https://dorm.mju.ac.kr/dorm/6640/subview.do", "https://www.youtube.com/watch?v=u-JLFts2Pxc&t=104s", "https://www.gansam.com/works/work.php?code=works&idx=2527", "https://memory.library.kr/files/original/f962a9ceb37087ac01a6564c77847219.pdf", "https://map.naver.com/p/search/campus", "https://www.google.com/maps/search/campus", "https://apps.apple.com/app/id311867728", "https://play.google.com/store/apps/details?id=com.nhn.android.nmap", "https://app.notion.com/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505"};
        String[] rejected = {"https://mostadmired.tistory.com/999", "https://mostadmired.tistory.com/231?redirect=evil", "https://blog.naver.com/other/223423515444", "https://mostadmired.tistory.com.evil.example/231", "http://www.mju.ac.kr/", "https://mju.ac.kr.evil.example/", "https://mju.ac.kr@evil.example/", "https://evil.example@mju.ac.kr/", "https://mju.ac.kr:444/", "javascript:alert(1)", "file:///sdcard/test.html", "content://contacts/1", "intent://test#Intent;scheme=https;end", "nmap://place?lat=1&lng=1", "https://www.youtube.com/watch?v=other", "https://www.youtube.com/watch?v=u-JLFts2Pxc&next=evil", "https://www.youtube.com/watch?v=u-JLFts2Pxc&v=other", "https://www.gansam.com/other", "https://memory.library.kr/other.pdf", "https://www.google.com/search?q=campus", "https://appassets.androidplatform.net/assets/index.html", "https://app.notion.com/other", "https://evil.example/", "https://mju.ac.kr\\@evil.example/"};
        for (String value : accepted) if (!ExternalLinkPolicy.allows(value)) throw new AssertionError("Rejected source: "+value);
        for (String value : rejected) if (ExternalLinkPolicy.allows(value)) throw new AssertionError("Unsafe URL accepted: "+value);
        int instagramCases = 0;
        for (String host : new String[]{"instagram.com", "www.instagram.com"}) {
            for (String handle : new String[]{"o_ulami", "mjhs_lounge", "mju_lounge", "mj_bokji_foodist"}) {
                for (String suffix : new String[]{"", "/"}) {
                    for (String value : new String[]{"https://"+host+"/"+handle+suffix, "https://"+host+"/"+handle.toUpperCase(java.util.Locale.ROOT)+"/p/AbC_123-x"+suffix, "https://"+host+"/stories/"+handle.toUpperCase(java.util.Locale.ROOT)+"/12345678901234567890123456789012"+suffix}) {
                        if (!ExternalLinkPolicy.allows(value)) throw new AssertionError("Rejected Instagram source: "+value);
                        instagramCases++;
                    }
                }
            }
        }
        String[] instagramAccepted = {
            "https://www.instagram.com/O_ulami/", "HTTPS://WWW.INSTAGRAM.COM:443/O_ULAMI/",
            "https://instagram.com/p/AbC_123-x/", "https://www.instagram.com/reel/AbC_123-x",
            "https://www.instagram.com/mj_bokji_foodist/reel/AbC_123-x/"
        };
        String[] instagramRejected = {
            "http://www.instagram.com/o_ulami/", "https://www.instagram.com:444/o_ulami/", "https://www.instagram.com:0443/o_ulami/",
            "https://www.instagram.com.evil.example/o_ulami/", "https://instagram.com@evil.example/o_ulami/", "https://evil.example@instagram.com/o_ulami/",
            "https://m.instagram.com/o_ulami/", "https://l.instagram.com/?u=https://evil.example", "instagram://user?username=o_ulami",
            "https://www.instagram.com/", "https://www.instagram.com/not_a_reviewed_account/", "https://www.instagram.com/not_a_reviewed_account/p/AbC123/",
            "https://www.instagram.com/accounts/login/", "https://www.instagram.com/direct/inbox/",
            "https://www.instagram.com/stories/not_a_reviewed_account/123456/", "https://www.instagram.com/stories/o_ulami/not-a-number/",
            "https://www.instagram.com/stories/o_ulami/", "https://www.instagram.com/stories/highlights/123456/",
            "https://www.instagram.com/stories/o_ulami/123456789012345678901234567890123/",
            "https://www.instagram.com/stories/o_ulami/123456/?igsh=tracking",
            "https://www.instagram.com/o_ulami/?igsh=tracking", "https://www.instagram.com/p/AbC123/?utm_source=tracking", "https://www.instagram.com/p/AbC123/?",
            "https://www.instagram.com/o_ulami/#section", "https://www.instagram.com/o_ulami/#", "https://www.instagram.com/o_ulami/?next=https://evil.example",
            "https://www.instagram.com/p/", "https://www.instagram.com/reels/AbC123/", "https://www.instagram.com/p/AbC123/embed/", "https://www.instagram.com/p/AbC123/extra",
            "https://www.instagram.com//o_ulami/", "https://www.instagram.com/unreviewed/../o_ulami/", "https://www.instagram.com/%2e/o_ulami/",
            "https://www.instagram.com/%6f_ulami/", "https://www.instagram.com/p/AbC%2f123/", "https://www.instagram.com\\o_ulami/",
            " https://www.instagram.com/o_ulami/", "https://www.instagram.com/o_ulami/\n", "https://www.instagram.com/o_\tulami/",
            "https://www.instagram.com/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/"
        };
        for (String value : instagramAccepted) if (!ExternalLinkPolicy.allows(value)) throw new AssertionError("Rejected Instagram source: "+value);
        for (String value : instagramRejected) if (ExternalLinkPolicy.allows(value)) throw new AssertionError("Unsafe Instagram URL accepted: "+value);
        System.out.println((accepted.length+rejected.length+instagramCases+instagramAccepted.length+instagramRejected.length)+" external-link policy cases passed");
    }
}
