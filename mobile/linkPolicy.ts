const INSTAGRAM_SOURCE_HANDLES = new Set(['o_ulami', 'mjhs_lounge', 'mju_lounge', 'mj_bokji_foodist']);

/** Only reviewed source/map hosts and publisher-configured pages leave the WebView. */
export function allowedExternalLink(value: string, publisherPages: unknown[] = []): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'instagram.com' || host === 'www.instagram.com') {
      // Match the original URL: URL() normalizes dot segments, backslashes and
      // whitespace. Only canonical external links are accepted, never embeds.
      const raw = /^https:\/\/(?:www\.)?instagram\.com(?::443)?(\/[^?#\s\\]*)$/i.exec(value);
      if (!raw) return false;
      const profile = /^\/([A-Za-z0-9._]+)\/?$/.exec(raw[1]!);
      if (profile) return INSTAGRAM_SOURCE_HANDLES.has(profile[1]!.toLowerCase());
      const story = /^\/stories\/([A-Za-z0-9._]+)\/[0-9]{1,32}\/?$/.exec(raw[1]!);
      if (story) return INSTAGRAM_SOURCE_HANDLES.has(story[1]!.toLowerCase());
      const post = /^\/(?:([A-Za-z0-9._]+)\/)?(?:p|reel)\/[A-Za-z0-9_-]{1,64}\/?$/.exec(raw[1]!);
      // A shortcode alone does not prove its author; imported records must be reviewed.
      return !!post && (!post[1] || INSTAGRAM_SOURCE_HANDLES.has(post[1].toLowerCase()));
    }
    if (host === 'app.notion.com' && url.pathname === '/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505' && !url.search) return true;
    if (host === 'mju.ac.kr' || host.endsWith('.mju.ac.kr')) return true;
    if (host === 'mostadmired.tistory.com' && url.pathname === '/231' && !url.search) return true;
    if (host === 'blog.naver.com' && url.pathname === '/govlrodtnr/223423515444' && !url.search) return true;
    if (host === 'memory.library.kr' && url.pathname === '/files/original/f962a9ceb37087ac01a6564c77847219.pdf' && !url.search) return true;
    // Only the reviewed university tour; an arbitrary YouTube URL is not a campus source.
    if (host === 'www.youtube.com' && url.pathname === '/watch' && url.searchParams.get('v') === 'u-JLFts2Pxc' && [...url.searchParams.keys()].every(k => k === 'v' || k === 't') && (!url.searchParams.has('t') || /^\d+s?$/.test(url.searchParams.get('t')!))) return true;
    if (host === 'www.gansam.com' && ((url.pathname === '/works/work.php' && url.search === '?code=works&idx=2527') || (url.pathname === '/admin/data/bbs/works/2105110910094_5.jpg' && !url.search))) return true;
    if (['maps.app.goo.gl', 'map.naver.com', 'naver.me', 'maps.google.com', 'apps.apple.com', 'play.google.com'].includes(host)) return true;
    if (host === 'www.google.com' && (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))) return true;
    return publisherPages.some(page => typeof page === 'string' && new URL(page).origin === url.origin);
  } catch { return false; }
}
