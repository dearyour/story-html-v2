/* App — the product as it really runs. A chapter hands AppCam camera keys over captured screens (SHOTS:
   css px of the capture, embedded by build.mjs from shots/), rings ("marks"), loupes and a demo cursor in
   the same screenshot coordinates. The camera flies between keys around each step boundary so the reader
   sees exactly where to look and what is pressed. Under the window a dark mechanism panel (Mech + Graph)
   draws HOW that screen works. Everything is a pure function of p: rewinding replays it backwards.
   Recorded pixels are never redrawn — a sequence swaps real frames like a flipbook. */

const APPD = { w: 1000, h: 610, mech: 224, gap: 16 }; // desktop design: window + mechanism panel
const APPM = { w: 380, h: 300, mech: 250, gap: 12 }; // phone design
const BAR = 34; // address bar height inside the window
const MINW = 1060; // narrowest desktop camera (css px of the capture) — see AppCam def.minW

/** Design size of a chapter canvas that stacks the app window over a mechanism panel. */
const appSize = (m) => {
  const d = m ? APPM : APPD;
  return [d.w, d.h + d.gap + d.mech];
};

/** A named element measured at capture time (shots.config boxes) → { x, y, w, h } in the shot's css px.
    An array of names gives their union (a ring around a run of rows). */
function box(shot, name, pad = 0) {
  if (Array.isArray(name)) {
    const bs = name.map((n) => box(shot, n));
    const x = Math.min(...bs.map((b) => b.x));
    const y = Math.min(...bs.map((b) => b.y));
    const r = Math.max(...bs.map((b) => b.x + b.w));
    const btm = Math.max(...bs.map((b) => b.y + b.h));
    return { x: x - pad, y: y - pad, w: r - x + pad * 2, h: btm - y + pad * 2 };
  }
  const b = SHOTS[shot]?.boxes?.[name];
  if (!b) {
    console.error(`[shots] no box "${name}" in shot "${shot}" — add it to shots.config.mjs boxes and re-capture`);
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}
/** Centre of a named box (for cursor keys): { x, y }. dx/dy nudge it (e.g. to stand on a button's label). */
function spot(shot, name, dx = 0, dy = 0) {
  const b = box(shot, name);
  return { x: b.x + b.w / 2 + dx, y: b.y + b.h / 2 + dy };
}
/** A recorded sequence (shots.config `type` / `record`) spread evenly across p ∈ [a, b] → [{ at, shot }]. */
function seq(name, a, b) {
  const list = SEQS[name];
  if (!list) {
    console.error(`[shots] no sequence "${name}" — record it with shots.config type/record`);
    return [];
  }
  return list.map((shot, i) => ({ at: list.length > 1 ? lerp(a, b, i / (list.length - 1)) : a, shot }));
}

/**
 * AppCam(host, def) → { node, update(p), resize(mobile), load() }
 * def = {
 *   keys:   [{ at, shot, x, y, w } | { at, shot, box: "name", w?, dx?, dy? }, …]  camera framings
 *           x, y = top-left of the framed rect, w = its width in capture px (height follows the view);
 *           box = centre on a measured element. Phones: mw (width), mx/my (centre) — default to the box.
 *           cap: "pill text" shown bottom-left while the key holds. path: address-bar path (default: the shot's).
 *   marks:  [{ from, to, shot, x, y, w, h | box: "name", pad?, label, c, below, right, spot, lens }]
 *           ring + label on a region; spot dims the rest; lens = magnify ×n in a loupe beside it
 *           (lensBox: "name" focuses a measured box — e.g. a { selector, text } run — else lensFocus:
 *           [fx, fy] 0..1 inside the mark, default centre · lensSize: px, default 230).
 *   cursor: [{ at, x, y | box: "name", dx?, dy?, label, click, hide, hold }]  — box keys resolve on the
 *           shot the camera holds at that moment; hold = p the cursor (and its label) stays before leaving.
 *   sequence: [{ at, shot }] — recorded frames (use seq()); shown from the first frame's at, and the last
 *           frame holds until the camera leaves for a key placed after the recording.
 *   minW: narrowest desktop framing (default 1060) · host: address-bar host
 *   size / msize: { w, h } window design on desktop / phones (default: the window above a mechanism panel)
 * }
 */
function AppCam(host, def) {
  const frames = def.sequence || [];
  const used = [...new Set([...def.keys.map((k) => k.shot), ...(def.marks || []).map((m) => m.shot)].filter(Boolean))];
  for (const k of [...used, ...frames.map((f) => f.shot)]) if (!SHOTS[k]) console.error(`[AppCam] unknown shot "${k}" — capture it (capture.mjs) or fix the key`);
  const has = (k) => Boolean(SHOTS[k]);
  const node = el(`<div class="ac">
      <div class="ac-bar"><span class="ac-dots"><i></i><i></i><i></i></span>
        <span class="ac-url"><b>${esc(def.host ?? CAPTURE.host ?? "")}</b><em data-path></em></span></div>
      <div class="ac-view">
        <div class="ac-world">${used
          .map((k) =>
            has(k)
              ? `<img class="ac-img" data-shot="${k}" alt="" style="width:${SHOTS[k].w}px;height:${SHOTS[k].h}px" decoding="async">`
              : `<div class="ac-img ac-missing" data-shot="${k}" style="width:1440px;height:900px"><span>캡처 대기 · ${esc(k)}</span></div>`,
          )
          .join("")}<div class="ac-marks"></div></div>
        <div class="ac-lens" aria-hidden="true"><img alt=""></div>
        <div class="ac-scrim"></div>
        <div class="demo-cursor ac-cur" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2.5l7.2 18.4 2.5-7.6 7.6-2.5z"/></svg><span></span></div>
        <p class="ac-cap"><i></i><span data-cap></span></p>
      </div>
    </div>`);
  host.appendChild(node);
  const world = $(".ac-world", node);
  const marksBox = $(".ac-marks", world);
  const frameImage = frames.length ? el(`<img class="ac-img ac-recording" alt="" decoding="sync">`) : null;
  if (frameImage) world.insertBefore(frameImage, marksBox);
  let frameKey = "";
  const imgs = Object.fromEntries($$(".ac-img[data-shot]", world).map((im) => [im.dataset.shot, im]));
  const dims = (k) => SHOTS[k] || { w: 1440, h: 900 };
  // Decode lazily: give the images their data only when the chapter first updates.
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    for (const k of used) if (has(k)) imgs[k].src = SHOTS[k].src;
  };
  const cur = $(".ac-cur", node);
  const curLabel = $("span", cur);
  const cap = $("[data-cap]", node);
  const capBox = $(".ac-cap", node);
  const pathEl = $("[data-path]", node);
  const lens = $(".ac-lens", node);
  const lensImg = $("img", lens);

  const keys = def.keys.map((k) => ({ ...k })).sort((a, b) => a.at - b.at);
  const D = def.size || APPD;
  const DM = def.msize || APPM;
  let VW = D.w;
  let VH = D.h - BAR;
  // Keys are stored as centres so the same key frames well at any view aspect.
  for (const k of keys) {
    if (k.box) {
      const b = box(k.shot, k.box);
      k.w = k.w ?? MINW;
      k.cx = b.x + b.w / 2 + (k.dx || 0);
      k.cy = b.y + b.h / 2 + (k.dy || 0);
      k.mw = k.mw ?? clamp(b.w * 1.25, 380, 760);
      k.mx = k.mx ?? b.x + b.w / 2;
      k.my = k.my ?? b.y + b.h / 2;
    } else {
      k.cx = k.x + k.w / 2;
      k.cy = k.y + (k.w * (D.h - BAR)) / D.w / 2;
    }
    k.path = k.path ?? SHOTS[k.shot]?.path ?? "";
  }
  // Two consecutive keys that ask for different places but land on the same frame (the shot is too small
  // for this width, so both clamp to its edge) make a camera that "barely moves" — warn so check.mjs logs it.
  const frameOf = (k) => {
    const sh = dims(k.shot);
    const w = Math.max(k.w, Math.min(def.minW ?? MINW, sh.w));
    const vh = ((D.h - BAR) * w) / D.w;
    const x = w >= sh.w ? 0 : clamp(k.cx - w / 2, 0, sh.w - w);
    const y = vh >= sh.h ? 0 : clamp(k.cy - vh / 2, 0, sh.h - vh);
    return { x, y, w };
  };
  keys.forEach((k, i) => {
    const prev = keys[i - 1];
    if (!prev || prev.shot !== k.shot) return;
    const asked = Math.hypot(k.cx - prev.cx, k.cy - prev.cy);
    const [fa, fb] = [frameOf(prev), frameOf(k)];
    const moved = Math.hypot(fa.x - fb.x, fa.y - fb.y) + Math.abs(fa.w - fb.w);
    if (asked > 120 && moved < 24)
      console.warn(`[AppCam] keys at ${prev.at} and ${k.at} on "${k.shot}" land on the same frame — the shot is too small to move there at this width (capture fullPage, lower w, or use a mark/loupe instead)`);
  });
  const shotAt = (at) => {
    let s = keys[0].shot;
    for (const k of keys) if (k.at <= at) s = k.shot;
    return s;
  };
  const marks = (def.marks || []).map((m) => {
    const r = m.box ? box(m.shot, m.box, m.pad ?? 6) : m;
    const n = el(`<div class="ac-mark${m.spot ? " is-spot" : ""}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;--c:${m.c || "var(--signal)"}">${
      m.label ? `<span class="ac-mark-l${m.below ? " is-below" : ""}${m.right ? " is-right" : ""}">${m.label}</span>` : ""
    }</div>`);
    marksBox.appendChild(n);
    const lb = m.lensBox ? box(m.shot, m.lensBox) : null;
    return { ...m, x: r.x, y: r.y, w: r.w, h: r.h, n, focus: lb ? [lb.x + lb.w / 2, lb.y + lb.h / 2] : null };
  });
  const cursorKeys = (def.cursor || [])
    .map((c) => (c.box ? { ...c, ...spot(c.shot || shotAt(c.at), c.box, c.dx, c.dy) } : c))
    .sort((a, b) => a.at - b.at);
  // 2026-10-21 user: 「너무 확대돼서 어디서 어디를 선택했는지 가늠이 안 됨」 → the desktop camera never frames
  // narrower than minW, so the sidebar, header and neighbouring columns stay in view. Small text that needs
  // reading gets a loupe (mark.lens) instead of a deeper zoom.
  const minW = def.minW ?? MINW;
  const effW = (k) => (Engine.mobile ? k.mw || Math.min(k.w, 760) : Math.max(k.w, Math.min(minW, dims(k.shot).w)));

  function resize(mobile) {
    VW = mobile ? DM.w : D.w;
    VH = (mobile ? DM.h : D.h) - BAR;
  }
  /** Camera at p: the two keys being blended, the blend k, the centre and the framed width. */
  function camAt(p) {
    let a = keys[0];
    let b = keys[0];
    let k = 0;
    for (let i = 1; i < keys.length; i++) {
      const prev = keys[i - 1];
      const nx = keys[i];
      const span = Math.min(0.05, (nx.at - prev.at) * 0.5);
      const t0 = nx.at - span * 0.55;
      const t1 = nx.at + span * 0.45;
      if (p >= t1 || (Engine.reduce && p >= nx.at)) {
        a = b = nx;
        k = 0;
        continue;
      }
      if (p > t0 && !Engine.reduce) {
        a = prev;
        b = nx;
        k = E.inOut(seg(p, t0, t1));
      }
      break;
    }
    const cx = (key) => (Engine.mobile ? key.mx ?? key.cx : key.cx);
    const cy = (key) => (Engine.mobile ? key.my ?? key.cy : key.cy);
    return { a, b, k, cx: lerp(cx(a), cx(b), k), cy: lerp(cy(a), cy(b), k), w: lerp(effW(a), effW(b), k) };
  }
  const place = (c) => {
    const s = VW / c.w;
    const sh = dims((c.k < 0.5 ? c.a : c.b).shot);
    const vw = c.w;
    const vh = VH / s;
    const x = vw >= sh.w ? (sh.w - vw) / 2 : clamp(c.cx - vw / 2, 0, sh.w - vw);
    const y = vh >= sh.h ? (sh.h - vh) / 2 : clamp(c.cy - vh / 2, 0, sh.h - vh);
    return { s, x, y };
  };
  /** Capture px → view px under the current camera (for overlays placed outside the world). */
  let cam = { s: 1, x: 0, y: 0 };
  const project = (x, y) => ({ x: (x - cam.x) * cam.s, y: (y - cam.y) * cam.s + BAR });

  let pressedAt = -1;
  function update(p) {
    load();
    const c = camAt(p);
    cam = place(c);
    const { s, x, y } = cam;
    world.style.transform = `scale(${s.toFixed(4)}) translate(${(-x).toFixed(1)}px, ${(-y).toFixed(1)}px)`;
    setVar(world, "--is", (1 / s).toFixed(4));
    for (const k of used) {
      const o = c.a.shot === c.b.shot ? (k === c.a.shot ? 1 : 0) : k === c.a.shot ? 1 - c.k : k === c.b.shot ? c.k : 0;
      const v = o.toFixed(3);
      if (imgs[k].style.opacity !== v) imgs[k].style.opacity = v;
    }
    // Recorded frames cover the key shots from the first frame on; the last frame holds until the camera
    // leaves for a key placed after the recording (fading with that move), so no older shot flashes in.
    if (frameImage) {
      const lastAt = frames[frames.length - 1].at;
      const held = (key) => key.at <= lastAt;
      const cover = p < frames[0].at ? 0 : held(c.a) ? (c.b === c.a || held(c.b) ? 1 : 1 - c.k) : 0;
      const live = cover > 0;
      let f = frames[0];
      for (const cand of frames) {
        if (cand.at > p) break;
        f = cand;
      }
      if (live && f.shot !== frameKey && has(f.shot)) {
        frameKey = f.shot;
        const r = SHOTS[frameKey];
        frameImage.src = r.src;
        frameImage.style.width = `${r.w}px`;
        frameImage.style.height = `${r.h}px`;
      }
      frameImage.style.opacity = cover.toFixed(3);
    }
    const key = c.k < 0.5 ? c.a : c.b;
    setText(cap, key.cap || "");
    toggle(capBox, "is-on", Boolean(key.cap));
    setText(pathEl, key.path || "");
    // Marks (and their loupes) show only while the camera holds still on their shot.
    const settled = !(c.k > 0.12 && c.k < 0.88);
    let spotOn = false;
    let lensMark = null;
    for (const m of marks) {
      const on = p >= m.from && p < m.to && (!m.shot || m.shot === key.shot) && settled;
      toggle(m.n, "is-on", on);
      if (on && m.spot) spotOn = true;
      if (on && m.lens) lensMark = m;
    }
    toggle(node, "has-spot", spotOn);
    placeLens(lensMark, key.shot);
    moveCursor(p, s, x, y);
  }

  /** Loupe: a round window beside a mark showing that region at mark.lens × the camera's scale. */
  function placeLens(m, shot) {
    toggle(lens, "is-on", Boolean(m) && !Engine.mobile);
    if (!m || Engine.mobile || !has(shot)) return;
    if (lensImg.dataset.shot !== shot) {
      lensImg.dataset.shot = shot;
      lensImg.src = SHOTS[shot].src;
      lensImg.style.width = `${SHOTS[shot].w}px`;
      lensImg.style.height = `${SHOTS[shot].h}px`;
    }
    const L = m.lensSize || 230;
    const z = cam.s * m.lens;
    const [fx, fy] = m.lensFocus || [0.5, 0.5];
    const [px, py] = m.focus || [m.x + m.w * fx, m.y + m.h * fy];
    const c = project(px, py);
    const right = project(m.x + m.w, 0).x;
    const left = project(m.x, 0).x;
    const lx = right + 24 + L <= VW ? right + 24 : left - 24 - L >= 0 ? left - 24 - L : VW - L - 12;
    const ly = clamp(c.y - L / 2, BAR + 10, BAR + VH - L - 10);
    lens.style.cssText = `--c:${m.c || "var(--signal)"};width:${L}px;height:${L}px;transform:translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
    const ox = L / 2 - px * z;
    const oy = L / 2 - py * z;
    lensImg.style.transform = `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(${z.toFixed(4)})`;
  }

  function moveCursor(p, s, x, y) {
    if (!cursorKeys.length || Engine.reduce) {
      cur.style.opacity = "0";
      return;
    }
    const list = cursorKeys;
    const first = list[0].at;
    const last = list[list.length - 1].at;
    let vis = Math.min(seg(p, first - 0.03, first), 1 - seg(p, last + 0.04, last + 0.07));
    let i = 0;
    for (let j = 0; j < list.length; j++) if (p >= list[j].at) i = j;
    const A = list[i];
    const B = list[Math.min(list.length - 1, i + 1)];
    const hold = Math.min(A.hold || 0, (B.at - A.at) * 0.8);
    const gap = Math.max(0.001, B.at - A.at - hold);
    const kk = B === A ? 0 : E.travel(seg((p - A.at - hold) / gap, 0, 0.55));
    if (A.hide) vis = 0;
    cur.style.opacity = vis.toFixed(3);
    cur.style.transform = `translate3d(${((lerp(A.x, B.x, kk) - x) * s).toFixed(1)}px, ${((lerp(A.y, B.y, kk) - y) * s).toFixed(1)}px, 0)`;
    const lab = kk < 0.4 ? A.label || "" : "";
    setText(curLabel, lab);
    toggle(cur, "has-label", Boolean(lab));
    if (A.click && p - A.at < 0.015 && pressedAt !== i) {
      pressedAt = i;
      cur.classList.remove("is-click");
      void cur.offsetWidth;
      cur.classList.add("is-click");
    }
    if (pressedAt === i && p - A.at >= 0.03) pressedAt = -1;
  }
  return { node, world, update, resize, load, project, get camera() { return cam; } };
}

/** Dark mechanism panel under the window: a mono title, a live caption, and a body the chapter fills
    (a Graph — see below — rather than rows of text). cap(text) swaps the caption per step. */
function Mech(host, title, sub = "") {
  const node = el(`<section class="mech"><header class="mech-h"><b>${title}</b><span>${sub}</span></header><div class="mech-b"></div></section>`);
  host.appendChild(node);
  const head = $(".mech-h span", node);
  return { node, body: $(".mech-b", node), cap: (text) => setText(head, text || "") };
}

/**
 * A chapter that shows the app window (+ mechanism panel). Returns { C, fit, app, mech, resize() }.
 * opts: { layout: "split", ctx: "ctx-a", mech: true, stamp: "2026-10-23 화면" }
 */
function AppChapter(id, steps, cam, mechTitle, mechSub = "", opts = {}) {
  const C = Chapter(id, { layout: opts.layout || "split", ctx: opts.ctx || "ctx-a", steps, link: opts.link, kicker: opts.kicker });
  const withMech = opts.mech !== false && mechTitle !== false;
  // Without a panel the window takes the capture's aspect (16:10) and sits centred in the same canvas,
  // leaving stage above and below for whatever the chapter stages around it.
  if (!withMech) {
    cam.size = cam.size || { w: APPD.w, h: Math.round(APPD.w / 1.6 + BAR) };
    cam.msize = cam.msize || { w: APPM.w, h: Math.round(APPM.w / 1.6 + BAR) };
  }
  const [w, h] = appSize(false);
  const fit = Fit(C.product, w, h, { mobile: appSize(true) });
  fit.inner.classList.add("appfit");
  toggle(fit.inner, "no-mech", !withMech);
  const camHost = el(`<div class="appfit-cam"></div>`);
  fit.inner.append(camHost);
  const app = AppCam(camHost, cam);
  let mech = null;
  if (withMech) {
    const mechHost = el(`<div class="appfit-mech"></div>`);
    fit.inner.append(mechHost);
    mech = Mech(mechHost, mechTitle, mechSub);
  }
  simStamp(C.product, opts.stamp || cam.stamp || `${CAPTURE.captured} 화면`);
  C.product.dataset.capsuleFrom = "";
  let wasMobile = null;
  // Canvas (fit.inner) coordinates of the window and the panel body, measured in resize().
  const geo = { cam: { x: 0, y: 0 }, mech: null };
  return {
    C,
    fit,
    app,
    mech,
    /** Capture px → canvas px under the current camera (overlays that cross window and panel). */
    toCanvas(x, y) {
      const v = app.project(x, y);
      return { x: geo.cam.x + v.x, y: geo.cam.y + v.y };
    },
    /** Graph viewBox px → canvas px (the SVG is centred and scaled to fit the panel body). */
    fromGraph(x, y) {
      const m = geo.mech;
      if (!m) return { x, y };
      const [vw, vh] = Engine.mobile ? [380, 216] : [1000, 188];
      const s = Math.min(m.w / vw, m.h / vh);
      return { x: m.x + (m.w - vw * s) / 2 + x * s, y: m.y + (m.h - vh * s) / 2 + y * s };
    },
    resize() {
      if (wasMobile !== Engine.mobile) {
        wasMobile = Engine.mobile;
        toggle(fit.inner, "is-m", Engine.mobile);
      }
      if (!withMech) camHost.style.height = `${(Engine.mobile ? cam.msize : cam.size).h}px`;
      app.resize(Engine.mobile);
      fit.resize();
      // Rect differences / scale: independent of which ancestor happens to be positioned.
      const fr = fit.inner.getBoundingClientRect();
      const s = fit.scale || 1;
      const at = (n) => {
        const r = n.getBoundingClientRect();
        return { x: (r.left - fr.left) / s, y: (r.top - fr.top) / s };
      };
      geo.cam = at(camHost);
      if (mech) geo.mech = { ...at(mech.body), w: mech.body.clientWidth, h: mech.body.clientHeight };
    },
  };
}

/** Rows of a mechanism panel that light up step by step: [[step, html, cls?], …] (prefer a Graph). */
function mechRows(rows) {
  return rows.map(([s, html, cls]) => `<div class="mr${cls ? ` ${cls}` : ""}" data-s="${s}">${html}</div>`).join("");
}
function lightRows(body, s) {
  for (const r of body.querySelectorAll(".mr")) {
    const at = Number(r.dataset.s);
    toggle(r, "is-on", at <= s);
    toggle(r, "is-now", at === s);
  }
}

/* ── Graph: the mechanism panel as a motion graphic ──────────────────────────────────────────────
   The panel under the window draws HOW the screen above works — states, requests, records, services as
   nodes and edges — instead of rows of text. The chapter writes plain SVG (viewBox 0 0 1000 188 on
   desktop, 0 0 380 216 on phones) and marks elements with data attributes; update(s, k) runs every
   frame with the step index s and the local progress k (0..1 inside that step), so the picture is a
   pure function of the scroll.
     data-on="2"            .is-on from step 2 · "2-4" only steps 2..4 · class g-dim keeps it faint when off
     data-now="3 5"         .is-now while the step is 3 or 5
     data-draw="2"          the stroke draws itself during step 2 · "2:0.1-0.7" during that part of it
     data-along="id" data-at="3:0-0.6"
                            a packet rides path #id during that window · data-stay parks it at the end
                            afterwards · data-wait shows it at the start earlier in that step ·
                            data-back rides backwards · data-loop="3" makes three trips in the window
     data-count="1:0-47"    text counts 0 → 47 early in step 1 (0 before, 47 after)
     data-type="4"          text types during step 4 · data-decode="4" resolves it from hex glyphs
     data-k="2:0.2-0.8"     sets --k 0 → 1 on the element through that window, for CSS to use
                            (progress bars: class g-bar · fades: g-in / g-out)
   Reduced motion settles every step (k = 1): strokes drawn, counts final, travelling packets hidden.
   Ids inside a chapter's SVG must carry the chapter prefix (they share one document). */
function Graph(host, def) {
  const node = el(`<div class="gx"></div>`);
  host.appendChild(node);
  host.classList.add("has-gx");
  const win = (v) => {
    const [st, part = "0-1"] = String(v).split(":");
    const [a, b] = part.split("-").map(Number);
    return { s: Number(st), a: Number.isFinite(a) ? a : 0, b: Number.isFinite(b) ? b : 1 };
  };
  const range = (v) => {
    const [a, b] = String(v).split("-").map(Number);
    return { a, b: String(v).includes("-") ? b : Infinity };
  };
  /** 0 before the window, 1 after it, linear inside (reduced motion: 1 from the window's step on). */
  const prog = (w, s, k) => (s < w.s ? 0 : s > w.s || Engine.reduce ? 1 : clamp((k - w.a) / Math.max(0.001, w.b - w.a)));
  let items = [];
  let mode = "";
  function mount(markup) {
    node.innerHTML = markup || "";
    const svg = $("svg", node);
    items = $$("[data-on],[data-now],[data-draw],[data-along],[data-count],[data-type],[data-decode],[data-k]", node).map((n) => {
      const d = n.dataset;
      const it = { n };
      if (d.on) it.on = range(d.on);
      if (d.now) it.now = d.now.trim().split(/\s+/).map(Number);
      if (d.draw) {
        it.draw = win(d.draw);
        it.len = Math.ceil(n.getTotalLength?.() || 0) + 1;
        n.style.strokeDasharray = `${it.len} ${it.len}`;
        n.style.strokeDashoffset = String(it.len);
      }
      if (d.along) {
        it.path = svg?.getElementById(d.along) || null;
        if (!it.path) console.error(`[Graph] no path #${d.along}`);
        it.plen = it.path?.getTotalLength?.() || 0;
        it.at = win(d.at || "0");
        it.loop = Number(d.loop) || 1;
      }
      if (d.count) {
        const [st, part = "0-0"] = d.count.split(":");
        const [f, t] = part.split("-").map(Number);
        it.count = { s: Number(st), f, t };
      }
      if (d.k) it.kw = win(d.k);
      if (d.type) it.type = win(d.type);
      if (d.decode) it.dec = win(d.decode);
      if (d.type || d.decode) it.text = n.textContent;
      return it;
    });
  }
  function resize() {
    const m = Engine.mobile && def.mobile ? "m" : "d";
    if (m === mode) return;
    mode = m;
    mount(m === "m" ? def.mobile : def.svg);
  }
  function update(s, k) {
    if (!mode) resize();
    for (const it of items) {
      const n = it.n;
      if (it.on) toggle(n, "is-on", s >= it.on.a && s <= it.on.b);
      if (it.now) toggle(n, "is-now", it.now.includes(s));
      if (it.draw) {
        const off = String(Math.round(it.len * (1 - E.reveal(prog(it.draw, s, k)))));
        if (n.style.strokeDashoffset !== off) n.style.strokeDashoffset = off;
      }
      if (it.path) {
        const w = it.at;
        let t = null;
        if (s === w.s && !Engine.reduce && k >= w.a && k <= w.b) {
          const raw = (k - w.a) / Math.max(0.001, w.b - w.a);
          t = it.loop > 1 ? Math.min(1, (raw * it.loop) % 1 || (raw >= 1 ? 1 : 0)) : raw;
          t = E.inOut(t);
        } else if ("stay" in n.dataset && (s > w.s || (s === w.s && (k > w.b || Engine.reduce)))) t = 1;
        else if ("wait" in n.dataset && s === w.s && k < w.a && !Engine.reduce) t = 0;
        toggle(n, "is-go", t !== null);
        if (t !== null && it.plen) {
          const pt = it.path.getPointAtLength(it.plen * ("back" in n.dataset ? 1 - t : t));
          setAttr(n, "transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
        }
      }
      if (it.count) {
        const c = it.count;
        const v = s < c.s ? 0 : s > c.s || Engine.reduce ? 1 : E.reveal(clamp(k / 0.6));
        setText(n, Math.round(lerp(c.f, c.t, v)).toLocaleString("ko-KR"));
      }
      if (it.kw) setVar(n, "--k", prog(it.kw, s, k).toFixed(3));
      if (it.type) setText(n, typed(it.text, prog(it.type, s, k)));
      if (it.dec) setText(n, decode(it.text, prog(it.dec, s, k), Engine.t));
    }
  }
  return { node, update, resize, remount: () => mount(mode === "m" ? def.mobile : def.svg) };
}

/** SVG snippets for Graph scenes. All coordinates are the node's centre. */
const G = {
  /** A rounded node chip: dot + label. opts: { w, h, c (css colour), cls, on, now, id, sub, dot, mono, r } */
  chip(x, y, label, o = {}) {
    const w = o.w || 120;
    const h = o.h || (o.sub ? 44 : 32);
    const attrs = `${o.on != null ? ` data-on="${o.on}"` : ""}${o.now != null ? ` data-now="${o.now}"` : ""}${o.id ? ` id="${o.id}"` : ""}`;
    const ty = o.sub ? -3 : 5;
    const tx = o.dot === false ? 0 : -w / 2 + 26;
    const anchor = o.dot === false ? ' text-anchor="middle"' : "";
    return `<g class="g-n${o.cls ? ` ${o.cls}` : ""}" transform="translate(${x} ${y})" style="--c:${o.c || "var(--ink3)"}"${attrs}>
      <rect class="g-b" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${o.r ?? 9}"/>
      ${o.dot === false ? "" : `<circle class="g-d" cx="${-w / 2 + 14}" cy="${o.sub ? -8 : 0}" r="4"/>`}
      <text class="g-t${o.mono === false ? " s" : ""}" x="${tx}" y="${ty}"${anchor}>${esc(label)}</text>
      ${o.sub ? `<text class="g-t k" x="${tx}" y="${ty + 17}"${anchor}>${esc(o.sub)}</text>` : ""}
    </g>`;
  },
  /** An edge path. opts: { id, c, on, draw, cls } */
  edge(d, o = {}) {
    return `<path class="g-e${o.cls ? ` ${o.cls}` : ""}" d="${d}"${o.id ? ` id="${o.id}"` : ""} style="--c:${o.c || "var(--ink3)"}"${o.on != null ? ` data-on="${o.on}"` : ""}${o.draw != null ? ` data-draw="${o.draw}"` : ""}/>`;
  },
  /** A packet that rides an edge: a dot, or a capsule with a short label. opts: { label, w, r, c, stay, wait, back, loop, cls } */
  packet(along, at, o = {}) {
    const flags = `${o.stay ? " data-stay" : ""}${o.wait ? " data-wait" : ""}${o.back ? " data-back" : ""}${o.loop ? ` data-loop="${o.loop}"` : ""}`;
    const body = o.label
      ? `<rect x="${-(o.w || 64) / 2}" y="-12" width="${o.w || 64}" height="24" rx="12"/><text class="g-t" x="0" y="4.5" text-anchor="middle">${esc(o.label)}</text>`
      : `<circle r="${o.r || 5}"/>`;
    return `<g class="g-pk${o.label ? " is-cap" : ""}${o.cls ? ` ${o.cls}` : ""}" style="--c:${o.c || "var(--signal)"}" data-along="${along}" data-at="${at}"${flags}>${body}</g>`;
  },
  /** Small glyphs drawn as paths (no emoji — the subset font renders some as boxes). */
  check: (x, y, c = "var(--mint)") => `<path class="g-ic" d="M${x - 6} ${y}l4 4 8-9" style="--c:${c}"/>`,
  cross: (x, y, c = "var(--err)") => `<path class="g-ic" d="M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10" style="--c:${c}"/>`,
  lock: (x, y, c = "var(--gold)") =>
    `<g class="g-ic" transform="translate(${x} ${y})" style="--c:${c}"><rect x="-7" y="-2" width="14" height="11" rx="2.5"/><path d="M-4 -2v-3a4 4 0 0 1 8 0v3"/></g>`,
};
