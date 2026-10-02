import dev.student.myongjiexplorer.standalone.ExternalLinkPolicy;
public final class ExternalLinkPolicyTest {
    public static void main(String[] args) {
        String[] accepted = {"https://www.mju.ac.kr/mjukr/index.do", "https://dorm.mju.ac.kr/dorm/6640/subview.do", "https://www.youtube.com/watch?v=u-JLFts2Pxc&t=104s", "https://www.gansam.com/works/work.php?code=works&idx=2527", "https://memory.library.kr/files/original/f962a9ceb37087ac01a6564c77847219.pdf", "https://map.naver.com/p/search/campus", "https://www.google.com/maps/search/campus", "https://apps.apple.com/app/id311867728", "https://play.google.com/store/apps/details?id=com.nhn.android.nmap", "https://app.notion.com/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505"};
        String[] rejected = {"http://www.mju.ac.kr/", "https://mju.ac.kr.evil.example/", "https://mju.ac.kr@evil.example/", "https://evil.example@mju.ac.kr/", "https://mju.ac.kr:444/", "javascript:alert(1)", "file:///sdcard/test.html", "content://contacts/1", "intent://test#Intent;scheme=https;end", "nmap://place?lat=1&lng=1", "https://www.youtube.com/watch?v=other", "https://www.youtube.com/watch?v=u-JLFts2Pxc&next=evil", "https://www.youtube.com/watch?v=u-JLFts2Pxc&v=other", "https://www.gansam.com/other", "https://memory.library.kr/other.pdf", "https://www.google.com/search?q=campus", "https://appassets.androidplatform.net/assets/index.html", "https://app.notion.com/other", "https://evil.example/", "https://mju.ac.kr\\@evil.example/"};
        for (String value : accepted) if (!ExternalLinkPolicy.allows(value)) throw new AssertionError("Rejected source: "+value);
        for (String value : rejected) if (ExternalLinkPolicy.allows(value)) throw new AssertionError("Unsafe URL accepted: "+value);
        System.out.println((accepted.length+rejected.length)+" external-link policy cases passed");
    }
}
