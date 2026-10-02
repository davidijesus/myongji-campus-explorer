/** Only reviewed source/map hosts and publisher-configured pages leave the WebView. */
export function allowedExternalLink(value: string, publisherPages: unknown[] = []): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'app.notion.com' && url.pathname === '/p/Myongji-University-Yongin-Campus-Definitive-Guide-2a396a3f3f60801fa233f911ed15b505' && !url.search) return true;
    if (host === 'mju.ac.kr' || host.endsWith('.mju.ac.kr')) return true;
    if (host === 'memory.library.kr' && url.pathname === '/files/original/f962a9ceb37087ac01a6564c77847219.pdf' && !url.search) return true;
    // Only the reviewed university tour; an arbitrary YouTube URL is not a campus source.
    if (host === 'www.youtube.com' && url.pathname === '/watch' && url.searchParams.get('v') === 'u-JLFts2Pxc' && [...url.searchParams.keys()].every(k => k === 'v' || k === 't') && (!url.searchParams.has('t') || /^\d+s?$/.test(url.searchParams.get('t')!))) return true;
    if (host === 'www.gansam.com' && ((url.pathname === '/works/work.php' && url.search === '?code=works&idx=2527') || (url.pathname === '/admin/data/bbs/works/2105110910094_5.jpg' && !url.search))) return true;
    if (['maps.app.goo.gl', 'map.naver.com', 'naver.me', 'maps.google.com', 'apps.apple.com', 'play.google.com'].includes(host)) return true;
    if (host === 'www.google.com' && (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))) return true;
    return publisherPages.some(page => typeof page === 'string' && new URL(page).origin === url.origin);
  } catch { return false; }
}
