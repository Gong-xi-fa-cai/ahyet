/* Reads a drawn shape the forgiving way: the $P point-cloud recognizer (Vatavu, Anthony, Wobbrock 2012).
   The drawing is compared with example shapes by where its points lie, not how neatly or in what order or how many
   strokes they were drawn, so a wobbly, squashed or half-closed heart or circle still counts. Scribbles that look
   more like a line, a V, a zigzag or a tick fall to those "no move" examples instead.
   Used by index.html; tests: node tools/test_shapes.js (makes hundreds of sloppy human-like drawings). */
(function (root) {
  var N = 40;

  function resample(pts, n) {
    var len = 0, i;
    for (i = 1; i < pts.length; i++) if (pts[i].s === pts[i - 1].s) len += dist(pts[i - 1], pts[i]);
    var I = len / (n - 1), D = 0, out = [{ x: pts[0].x, y: pts[0].y, s: pts[0].s }];
    var p = pts.slice();
    for (i = 1; i < p.length; i++) {
      if (p[i].s !== p[i - 1].s) continue;
      var d = dist(p[i - 1], p[i]);
      if (D + d >= I && d > 0) {
        var t = (I - D) / d, q = { x: p[i - 1].x + t * (p[i].x - p[i - 1].x), y: p[i - 1].y + t * (p[i].y - p[i - 1].y), s: p[i].s };
        out.push(q); p.splice(i, 0, q); D = 0;
      } else D += d;
    }
    while (out.length < n) out.push({ x: p[p.length - 1].x, y: p[p.length - 1].y, s: p[p.length - 1].s });
    return out.slice(0, n);
  }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function normalize(pts) {
    var p = resample(pts, N), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, cx = 0, cy = 0, i;
    for (i = 0; i < p.length; i++) { x0 = Math.min(x0, p[i].x); x1 = Math.max(x1, p[i].x); y0 = Math.min(y0, p[i].y); y1 = Math.max(y1, p[i].y); }
    var s = Math.max(x1 - x0, y1 - y0) || 1;
    p = p.map(function (q) { return { x: (q.x - x0) / s, y: (q.y - y0) / s }; });
    for (i = 0; i < p.length; i++) { cx += p[i].x; cy += p[i].y; }
    cx /= p.length; cy /= p.length;
    return p.map(function (q) { return { x: q.x - cx, y: q.y - cy }; });
  }
  function cloudDist(a, b, start) {
    var n = a.length, used = new Array(n), sum = 0, i = start, w;
    do {
      var best = Infinity, idx = -1;
      for (var j = 0; j < n; j++) if (!used[j]) { var d = dist(a[i], b[j]); if (d < best) { best = d; idx = j; } }
      used[idx] = true; w = 1 - ((i - start + n) % n) / n; sum += w * best; i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }
  function match(a, b) {
    var step = Math.floor(Math.sqrt(N)), best = Infinity;
    for (var i = 0; i < N; i += step) best = Math.min(best, cloudDist(a, b, i), cloudDist(b, a, i));
    return best;
  }

  /* ---- example shapes ---- */
  function curve(f, n, s) { var out = []; for (var i = 0; i <= n; i++) { var p = f(i / n); out.push({ x: p[0], y: p[1], s: s || 0 }); } return out; }
  function poly(points, s) {           // straight segments through the points, densely
    var out = [];
    for (var i = 1; i < points.length; i++) for (var k = 0; k < 20; k++) {
      var t = k / 20; out.push({ x: points[i - 1][0] + t * (points[i][0] - points[i - 1][0]), y: points[i - 1][1] + t * (points[i][1] - points[i - 1][1]), s: s || 0 });
    }
    out.push({ x: points[points.length - 1][0], y: points[points.length - 1][1], s: s || 0 }); return out;
  }
  function heart(wide, pointy) {        // the classic heart curve, y pointing down like the screen
    return curve(function (t) {
      var a = t * 2 * Math.PI, x = 16 * Math.pow(Math.sin(a), 3),
          y = 13 * Math.cos(a) - (5 - pointy) * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return [x * wide, -y];
    }, 80);
  }
  function ellipse(rx, ry) { return curve(function (t) { var a = t * 2 * Math.PI; return [rx * Math.cos(a), ry * Math.sin(a)]; }, 64); }
  var T = [];
  function add(name, pts) { T.push({ name: name, pts: normalize(pts) }); }
  [0.75, 0.9, 1.05, 1.2].forEach(function (w) { [0, 1.5].forEach(function (p) { add('heart', heart(w, p)); }); });
  [[1, 1], [1, 0.75], [0.75, 1], [1, 0.6], [0.6, 1]].forEach(function (r) { add('circle', ellipse(r[0], r[1])); });
  // shapes that are not a move
  add('none', poly([[0, 0], [1, 1]])); add('none', poly([[0, 0], [1, 0.2]]));
  add('none', poly([[0, 0], [0.5, 1], [1, 0]])); add('none', poly([[0, 1], [0.5, 0], [1, 1]]));
  add('none', poly([[0, 0], [0.25, 1], [0.5, 0], [0.75, 1], [1, 0]]));
  add('none', poly([[0, 0.6], [0.35, 1], [1, 0]]));
  add('none', curve(function (t) { return [t, 0.3 * Math.sin(t * 4 * Math.PI)]; }, 60));
  add('none', curve(function (t) { return [0.5 * Math.sin(t * 2 * Math.PI), t]; }, 60));      // an S
  add('none', poly([[0, 0], [1, 0], [0, 1], [1, 1]]));                                         // a Z

  var LIMIT = { heart: 1.7, circle: 1.95 }, MARGIN = 1.0;   // tuned by tools/test_shapes.js (17 Nov)

  function recognize(strokes) {
    var pts = [];
    strokes.forEach(function (s, k) { s.forEach(function (p) { pts.push({ x: p.x, y: p.y, s: k }); }); });
    if (pts.length < 8) return { name: null };
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    var w = x1 - x0, h = y1 - y0;
    if (Math.max(w, h) < 50 || Math.min(w, h) < 0.3 * Math.max(w, h)) return { name: null };   // too small or too thin
    var c = normalize(pts), best = {};
    T.forEach(function (t) { var d = match(c, t.pts); if (!(t.name in best) || d < best[t.name]) best[t.name] = d; });
    var win = null;
    ['heart', 'circle'].forEach(function (n) {
      var others = Math.min.apply(null, Object.keys(best).filter(function (k) { return k !== n; }).map(function (k) { return best[k]; }));
      if (best[n] < LIMIT[n] && best[n] * MARGIN < others && (!win || best[n] < best[win])) win = n;
    });
    // Heart or circle? A heart dips down in the middle of its top edge; a circle does not. Measured on the sloppy
    // test drawings: hearts dip 0.19 to 0.34 of their height, circles 0.01 to 0.10.
    if (win) {
      var cx = (x0 + x1) / 2, dip = -1;
      pts.forEach(function (p) { var u = (p.x - cx) / (w / 2), v = (p.y - y0) / h; if (Math.abs(u) < 0.15 && v < 0.6) dip = Math.max(dip, v); });
      if (dip > 0.16) win = 'heart'; else if (dip < 0.12) win = 'circle';
    }
    return { name: win, scores: best };
  }
  var api = { recognize: recognize, LIMIT: LIMIT, set: function (l, m) { LIMIT = l; MARGIN = m; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Shapes = api;
})(this);
