// Cloudflare Pages: answer "Range" requests for videos and music.
// iPhones (Safari) ask for a video in pieces ("bytes=0-1" first) and will not play it if the whole file comes back
// instead of the asked piece. Cloudflare Pages' file store answered every Range request with the whole file
// (checked 17 Nov 2026), so this script cuts out the asked piece and answers "206 Partial Content".
// Every other request goes straight to the file store. GitHub Pages ignores this file.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get('Range');
    if (!range || res.status !== 200) {
      if (res.status === 200 && /\.(mp4|mp3)$/.test(new URL(request.url).pathname)) {
        const h = new Headers(res.headers); h.set('Accept-Ranges', 'bytes');
        return new Response(res.body, { status: 200, headers: h });
      }
      return res;
    }
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) return res;
    const buf = await res.arrayBuffer(), size = buf.byteLength;
    let start, end;
    if (m[1] === '') { start = Math.max(size - Number(m[2]), 0); end = size - 1; }
    else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    const h = new Headers(res.headers);
    h.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
    h.set('Content-Length', String(end - start + 1));
    h.set('Accept-Ranges', 'bytes');
    return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
  },
};
