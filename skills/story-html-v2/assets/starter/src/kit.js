/* Kit — what every chapter uses. A chapter owns one scene: a sticky stage whose whole state is a
   pure function of the scroll progress p, so scrolling back replays the story in reverse.
   Engine (engine.js) supplies clamp · lerp · seg · $ · $$ · E (curves) · decode · Toast · Engine. */

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** Change-guarded DOM writes: call them every frame without touching layout when nothing changes. */
const toggle = (node, cls, on) => {
  if (node && node.classList.contains(cls) !== Boolean(on)) node.classList.toggle(cls, Boolean(on));
};
const setText = (node, text) => {
  if (node && node.textContent !== text) node.textContent = text;
};
const setHTML = (node, html) => {
  if (node && node.__html !== html) {
    node.__html = html;
    node.innerHTML = html;
  }
};
const setVar = (node, name, value) => {
  const v = String(value);
  if (node && node.style.getPropertyValue(name) !== v) node.style.setProperty(name, v);
};
const setAttr = (node, name, value) => {
  const v = String(value);
  if (node && node.getAttribute(name) !== v) node.setAttribute(name, v);
};
/** Index of the last stop ≤ p. */
const stepOf = (p, stops) => {
  let i = 0;
  for (let k = 0; k < stops.length; k++) if (p >= stops[k]) i = k;
  return i;
};
/** The first round(k·n) characters — scroll-scrubbed typing. */
const typed = (text, k) => {
  const chars = Array.from(text);
  return chars.slice(0, Math.round(chars.length * clamp(k))).join("");
};
/** Scroll-scrubbed count-up, formatted with thousands separators. */
const counted = (value, k) => Math.round(value * clamp(k)).toLocaleString("ko-KR");
/** Smooth 0→1 inside [a, b] on the reveal curve (most scene transitions). */
const ease = (p, a, b, curve = E.reveal) => curve(seg(p, a, b));

/**
 * Chapter frame. Builds the copy column (ghost numeral, kicker, org · period · detail link, title,
 * body, step list, source citation) and a product box, then swaps the copy as p passes each step.
 *
 * def = {
 *   layout: "split" | "stack" | "center",
 *   ctx: "ctx-a" | "ctx-b" | "ctx-c" | "signal",   // colour of the org mark (a base.css token)
 *   link: { href, label },                         // detail page for this chapter (optional)
 *   steps: [{ at, label, title, body, cite? }],    // title/body may contain <em>, <br>, <b>
 * }
 * returns { scene, stage, copy, product, steps, step(p) → index, local(p) → 0..1 inside the step }
 */
function Chapter(id, def) {
  const scene = document.getElementById(id);
  const stage = scene.querySelector(".stage");
  const [num, name] = scene.dataset.chapter.split(";")[0].split("|");
  const org = scene.dataset.org;
  const period = scene.dataset.period;
  const layout = def.layout || "split";
  const steps = def.steps;
  scene.classList.add("ch");
  stage.classList.add(`ly-${layout}`);
  stage.style.setProperty("--ctx", `var(--${def.ctx || "signal"})`);
  const meta = [
    org ? `<span class="org"><i></i><b>${esc(org)}</b></span>` : "",
    period ? `<span>${esc(period)}</span>` : "",
    def.link ? `<a href="${esc(def.link.href)}">${esc(def.link.label)} ↗</a>` : "",
  ].join("");
  const copy = el(`<div class="ch-copy">
      <span class="ghost-num" aria-hidden="true">${num}</span>
      <p class="kicker"><span class="num">${num}</span>${esc(def.kicker || name)}</p>
      ${meta ? `<p class="ch-meta">${meta}</p>` : ""}
      <h2 class="h2" data-t></h2>
      ${layout === "split" ? `<p class="body" data-b></p>` : ""}
      ${
        steps.length > 1
          ? `<ol class="ch-steps">${steps
              .map((s, i) => `<li><button type="button" data-i="${i}"><b>${String(i + 1).padStart(2, "0")}</b>${s.label}</button></li>`)
              .join("")}</ol>`
          : ""
      }
      ${layout === "split" ? `<p class="ch-cite" data-c hidden></p>` : ""}
    </div>`);
  stage.appendChild(copy);
  let lede = null;
  if (layout !== "split") {
    lede = el(`<div class="ch-lede"><p class="body" data-b></p><p class="ch-cite" data-c hidden></p></div>`);
    stage.appendChild(lede);
  }
  const product = el(`<div class="ch-product"></div>`);
  stage.appendChild(product);
  const title = $("[data-t]", copy);
  const body = $("[data-b]", lede || copy);
  const cite = $("[data-c]", lede || copy);
  const items = $$(".ch-steps li", copy);
  copy.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-i]");
    if (!button) return;
    const s = steps[Number(button.dataset.i)];
    Engine.scrollToScene(id, Math.min(0.995, s.at + 0.01));
  });
  const swap = (node, html) => {
    if (!node || node.__html === html) return;
    node.__html = html;
    node.innerHTML = html;
    node.classList.remove("is-swap");
    if (!Engine.reduce) {
      void node.offsetWidth;
      node.classList.add("is-swap");
    }
  };
  let current = -1;
  return {
    scene,
    stage,
    copy,
    lede,
    product,
    steps,
    get current() {
      return current;
    },
    /** Swaps title/body/citation when the step changes and fills the step's progress line. */
    step(p) {
      const s = stepOf(p, steps.map((x) => x.at));
      if (s !== current) {
        current = s;
        swap(title, steps[s].title);
        swap(body, steps[s].body);
        if (cite) {
          cite.hidden = !steps[s].cite;
          if (steps[s].cite) swap(cite, esc(steps[s].cite));
        }
        items.forEach((li, i) => {
          toggle(li, "is-on", i <= s);
          toggle(li, "is-now", i === s);
        });
        stage.dataset.step = String(s);
      }
      const next = steps[s + 1]?.at ?? 1;
      setVar(items[s], "--sp", clamp((p - steps[s].at) / Math.max(0.001, next - steps[s].at)).toFixed(3));
      return s;
    },
    /** 0..1 progress inside the current step. */
    local(p) {
      const s = Math.max(0, current);
      const next = steps[s + 1]?.at ?? 1;
      return clamp((p - steps[s].at) / Math.max(0.001, next - steps[s].at));
    },
  };
}

/**
 * Fixed-size product canvas scaled into its box. Design the product at (w × h) CSS pixels and call
 * fit.resize() from the chapter's resize(). On phones pass a second design size for the mobile
 * variant (and render the variant when Engine.mobile).
 */
function Fit(box, w, h, opts = {}) {
  const wrap = el(`<div class="fit-box"><div class="fit"></div></div>`);
  box.appendChild(wrap);
  const inner = wrap.firstElementChild;
  const size = () => (Engine.mobile && opts.mobile ? opts.mobile : [w, h]);
  const apply = () => {
    const [dw, dh] = size();
    inner.style.width = `${dw}px`;
    inner.style.height = `${dh}px`;
    const r = box.getBoundingClientRect();
    const k = Math.min(opts.max ?? 1, r.width / dw, r.height / dh);
    setVar(inner, "--fit", Math.max(0.2, k).toFixed(4));
    return k;
  };
  if (typeof ResizeObserver !== "undefined") {
    let frame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    }).observe(box);
  }
  return { box, inner, resize: apply, get scale() { return Number(inner.style.getPropertyValue("--fit")) || 1; } };
}

/**
 * Demo cursor — a pointer that performs the chapter's key actions as you scroll.
 * keys = [{ at, target: selector | Element, x?, y?, click?, label? }] (x/y = 0..1 inside the target).
 * Between two keys it travels on the travel curve during the first 55% of the gap, then dwells.
 * A click key presses its target (adds .is-pressed) and rings the cursor for a short window of p.
 */
function DemoCursor(root, keys) {
  const node = el(`<div class="demo-cursor" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2.5l7.2 18.4 2.5-7.6 7.6-2.5z"/></svg><span></span></div>`);
  root.appendChild(node);
  const label = node.querySelector("span");
  const find = (k) => (typeof k.target === "string" ? root.querySelector(k.target) : k.target);
  const point = (k) => {
    const t = find(k);
    if (!t) return null;
    const rr = root.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    // A target hidden in another step (display:none) has no box — keep the cursor where it was.
    if (!r.width && !r.height) return null;
    // Positions are in the root's own (unscaled) pixels when the root sits inside a scaled .fit.
    const scale = rr.width / (root.offsetWidth || rr.width) || 1;
    return {
      x: (r.left - rr.left + r.width * (k.x ?? 0.5)) / scale,
      y: (r.top - rr.top + r.height * (k.y ?? 0.5)) / scale,
    };
  };
  let pressed = null;
  let clickAt = -1;
  return {
    node,
    keys,
    update(p) {
      const list = this.keys;
      if (!list.length) return;
      const first = list[0].at;
      const last = list[list.length - 1].at;
      const vis = Engine.reduce ? 0 : Math.min(seg(p, first - 0.04, first), 1 - seg(p, last + 0.05, last + 0.09));
      node.style.opacity = vis.toFixed(3);
      if (vis <= 0) return;
      let i = 0;
      for (let k = 0; k < list.length; k++) if (p >= list[k].at) i = k;
      const a = list[i];
      const b = list[Math.min(list.length - 1, i + 1)];
      // A hidden key (its step is not on screen) borrows its neighbour's point.
      const pa = point(a) || point(b);
      const pb = point(b) || pa;
      if (!pa) return;
      const gap = Math.max(0.001, b.at - a.at);
      const k = b === a ? 0 : E.travel(seg((p - a.at) / gap, 0, 0.55));
      const x = lerp(pa.x, pb.x, k);
      const y = lerp(pa.y, pb.y, k);
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (a.hide) {
        node.style.opacity = "0";
        return;
      }
      // Label: shown on arrival and while the cursor is still near the key (not only at k === 0,
      // which in practice only happens on the last key).
      const lab = k < 0.35 ? a.label || "" : "";
      setText(label, lab);
      toggle(node, "has-label", Boolean(lab));
      // Press: while p sits just after a click key.
      const target = a.click && p - a.at < 0.02 ? find(a) : null;
      if (target !== pressed) {
        pressed?.classList.remove("is-pressed");
        target?.classList.add("is-pressed");
        pressed = target;
        if (target && clickAt !== i) {
          clickAt = i;
          node.classList.remove("is-click");
          void node.offsetWidth;
          node.classList.add("is-click");
        }
      }
      if (!target && p - a.at >= 0.02) clickAt = -1;
    },
  };
}

/** Positions a .ring highlight over a target inside root (root-local pixels, scale-aware). */
function placeRing(ring, root, target, pad = 6) {
  if (!ring || !root || !target) return;
  const rr = root.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const scale = rr.width / (root.offsetWidth || rr.width) || 1;
  ring.style.left = `${(r.left - rr.left) / scale - pad}px`;
  ring.style.top = `${(r.top - rr.top) / scale - pad}px`;
  ring.style.width = `${r.width / scale + pad * 2}px`;
  ring.style.height = `${r.height / scale + pad * 2}px`;
}

/** Marks the stage as an example screen (every product here is a local simulation). */
function simStamp(box, text = "예시 화면 · 실제 서비스 데이터 아님") {
  const node = el(`<p class="sim">${esc(text)}</p>`);
  box.appendChild(node);
  return node;
}
