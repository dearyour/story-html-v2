/* ───────────────────────── story-html · scroll engine ─────────────────────────
   Native scroll only. Each .scene is a tall section with one sticky stage; its
   progress p ∈ [0,1] is read every frame and handed to the scene's update().
   Scroll-scrubbed motion is reversible. */

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = (n) => Math.round(n).toLocaleString("en-US");

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0,
      hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

// Design-tab curves (lib/motion/scene.ts) plus two plain helpers.
const E = {
  reveal: cubicBezier(0.2, 0.7, 0.1, 1),
  lock: cubicBezier(0.7, 0, 0.2, 1),
  stamp: cubicBezier(0.3, 1.6, 0.4, 1),
  travel: cubicBezier(0.65, 0, 0.35, 1),
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
};

// Scroll-scrubbed decode: characters resolve left → right as p goes 0 → 1.
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/[]{}";
function decode(final, p, t = 0, seed = 0) {
  if (p >= 1) return final;
  let out = "";
  const n = final.length;
  const tick = Math.floor(t * 22);
  for (let i = 0; i < n; i++) {
    const ch = final[i];
    if (ch === " " || ch === "\n") {
      out += ch;
      continue;
    }
    const local = (p - (i / n) * 0.7) / 0.3;
    if (local >= 1) out += ch;
    else if (local <= 0) out += " ";
    else {
      const h = hash(i * 131 + seed * 7 + tick);
      const code = ch.charCodeAt(0);
      out +=
        code >= 0xac00 && code <= 0xd7a3
          ? String.fromCharCode(0xac00 + (h % 11172))
          : GLYPHS[h % GLYPHS.length];
    }
  }
  return out;
}

const Engine = {
  scenes: [],
  t: 0,
  dt: 0,
  last: 0,
  y: 0,
  vw: 0,
  vh: 0,
  mobile: false,
  reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
  pointer: { x: 0, y: 0, sx: 0, sy: 0, moved: false, down: false, last: 0 },
  listeners: [],
  add(def) {
    const el = document.getElementById(def.id);
    if (!el) throw new Error(`scene #${def.id} missing`);
    const s = { p: 0, raw: 0, top: 0, h: 0, on: false, enter: 0, exit: 0, ...def, el };
    this.scenes.push(s);
    return s;
  },
  on(fn) {
    this.listeners.push(fn);
  },
  measure() {
    this.vw = innerWidth;
    this.vh = innerHeight;
    this.mobile = this.vw < 820;
    document.documentElement.style.setProperty("--vh", `${this.vh}px`);
    for (const s of this.scenes) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      s.h = s.el.offsetHeight;
      s.resize?.(s);
    }
    this.frameNow(true);
  },
  frameNow(force) {
    const y = scrollY;
    this.y = y;
    const vh = this.vh;
    for (const s of this.scenes) {
      const span = Math.max(1, s.h - vh);
      s.raw = (y - s.top) / span;
      s.p = clamp(s.raw);
      s.enter = clamp((y - (s.top - vh)) / vh);
      s.exit = clamp((y - (s.top + s.h - vh)) / vh);
      const ev = this.reduce ? 1 : Math.round(s.enter * 400) / 400;
      if (ev !== s.ev) {
        s.ev = ev;
        s.el.style.setProperty("--e", String(ev));
      }
      const on = y + vh * 1.15 > s.top && y < s.top + s.h + vh * 0.15;
      if (on !== s.on) {
        s.on = on;
        s.el.classList.toggle("is-on", on);
        on ? s.show?.(s) : s.hide?.(s);
      }
      if (on || force) s.update?.(s.p, s);
    }
    for (const fn of this.listeners) fn(this);
  },
  tick(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    this.dt = dt;
    this.t += this.dt;
    const P = this.pointer;
    const k = 1 - Math.pow(0.0009, dt);
    P.sx = lerp(P.sx, P.x, k);
    P.sy = lerp(P.sy, P.y, k);
    this.frameNow(false);
    requestAnimationFrame((n) => this.tick(n));
  },
  start() {
    const P = this.pointer;
    P.x = P.sx = innerWidth * 0.62;
    P.y = P.sy = innerHeight * 0.52;
    addEventListener(
      "pointermove",
      (e) => {
        P.x = e.clientX;
        P.y = e.clientY;
        P.moved = true;
        P.last = this.t;
      },
      { passive: true },
    );
    let rt = 0;
    addEventListener("resize", () => {
      cancelAnimationFrame(rt);
      rt = requestAnimationFrame(() => this.measure());
    });
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", (e) => {
      this.reduce = e.matches;
      document.documentElement.classList.toggle("is-reduced", e.matches);
      this.measure();
    });
    document.documentElement.classList.toggle("is-reduced", this.reduce);
    this.measure();
    document.fonts?.ready.then(() => this.measure());
    addEventListener("load", () => this.measure());
    requestAnimationFrame((n) => this.tick(n));
  },
  scrollToScene(id, at = 0) {
    const s = this.scenes.find((x) => x.id === id);
    if (!s) return;
    const top = s.top + Math.max(0, s.h - this.vh) * at;
    scrollTo({ top, behavior: this.reduce ? "auto" : "smooth" });
  },
};

// Product-style notifications for moments the story passes (visual only; the page text carries the facts).
const Toast = {
  show(text, color = "var(--mint)") {
    const root = document.getElementById("toasts");
    if (!root) return;
    const t = document.createElement("p");
    t.className = "toast";
    t.style.setProperty("--c", color);
    t.innerHTML = `<i></i>${text}`;
    root.appendChild(t);
    while (root.children.length > 3) root.removeChild(root.firstChild);
    setTimeout(() => {
      t.classList.add("is-out");
      setTimeout(() => t.remove(), 420);
    }, 2600);
  },
};
