// Capture the product's real screens into shots/ — the pixels every chapter's camera flies over.
//   node capture.mjs                       → every shot in shots.config.mjs
//   node capture.mjs --only=list,detail    → only those keys (merged into the existing manifest)
//   node capture.mjs --config=other.mjs    → another config
// Each shot: open a URL of the running app (or a reconstruction page), run its steps, rewrite identifying
// text in the live DOM (config.replace / hide / blur), fail if a forbidden pattern is still on screen,
// measure named boxes (config.boxes + shot.boxes → exact coordinates for camera keys, marks and the
// cursor), screenshot the viewport and save it as WebP. Sequences record one frame per typed character
// (shot.type) or per step (shot.record) — played back as a flipbook by AppCam, never redrawn.
// shots/manifest.json holds css sizes, boxes, the display path and the sequences; build.mjs embeds it.
// Read-only by default: every request other than GET/HEAD/OPTIONS is aborted (and listed), so typing,
// clicking and recording cannot save, recompute or delete anything in a live tool. config.readOnly =
// false lifts it (an app that reads through POST/GraphQL) — then keep shot steps away from writes.
// Needs playwright-core and an installed Google Chrome (same lookup as check.mjs).
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dir = path.dirname(new URL(import.meta.url).pathname);
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const roots = [process.env.PW_DIR, path.join(os.homedir(), ".cache/story-html-pw"), dir].filter(Boolean);
let chromium;
for (const root of roots) {
  try {
    ({ chromium } = createRequire(path.join(root, "package.json"))("playwright-core"));
    break;
  } catch {}
}
if (!chromium) {
  console.error("playwright-core not found. Run once:\n  mkdir -p ~/.cache/story-html-pw && cd ~/.cache/story-html-pw && npm init -y >/dev/null && npm i playwright-core");
  process.exit(1);
}

const configPath = path.resolve(dir, arg("config") || "shots.config.mjs");
const config = (await import(pathToFileURL(configPath).href)).default;
const cfgDir = path.dirname(configPath);
// redact.local.mjs (git-ignored, never published): the real → fake dictionary and forbidden patterns.
// It names the real company / people / hosts, so it must not live in shots.config.mjs of a public repo.
const localPath = path.join(cfgDir, "redact.local.mjs");
if (fs.existsSync(localPath)) {
  const local = (await import(pathToFileURL(localPath).href)).default || {};
  config.replace = { ...(config.replace || {}), ...(local.replace || {}) };
  for (const k of ["forbid", "hide", "blur"]) config[k] = [...(config[k] || []), ...(local[k] || [])];
  console.log(`redact.local.mjs: ${Object.keys(local.replace || {}).length} replacements · ${(local.forbid || []).length} forbidden patterns`);
}
const outDir = path.resolve(cfgDir, config.out || "shots");
fs.mkdirSync(outDir, { recursive: true });
const manifestPath = path.join(outDir, "manifest.json");
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : { shots: {}, seqs: {} };
const only = arg("only")?.split(",").filter(Boolean);
const scale = config.scale ?? 2;
const quality = config.quality ?? 0.82;
const viewport = config.viewport || { width: 1440, height: 900 };
const forbid = (config.forbid || []).map((f) => (f instanceof RegExp ? f : new RegExp(String(f).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")));

const browser = await chromium.launch({ channel: "chrome", headless: true });
// config.context passes through to Playwright (e.g. { storageState: "auth.json" } for a logged-in app).
const context = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: "ko-KR", ...(config.context || {}) });
const page = await context.newPage();
const enc = await browser.newPage();
const logs = [];
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
const blocked = [];
if (config.readOnly !== false) {
  await context.route("**/*", (route) => {
    const req = route.request();
    if (["GET", "HEAD", "OPTIONS"].includes(req.method())) return route.continue();
    blocked.push(`${req.method()} ${req.url().slice(0, 120)}`);
    return route.abort();
  });
}

/** Rewrite identifying text in the live DOM, then hide / blur what text replacement cannot reach. */
async function redact() {
  await page.evaluate(
    ([dict, hide, blur]) => {
      const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
      if (keys.length) {
        const re = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
        const sub = (s) => s.replace(re, (m) => dict[m]);
        const walk = (root) => {
          const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n; (n = w.nextNode()); ) {
            const v = sub(n.nodeValue);
            if (v !== n.nodeValue) n.nodeValue = v;
          }
          for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
        };
        walk(document.body);
        for (const el of document.querySelectorAll("input, textarea")) {
          if (el.value) el.value = sub(el.value);
          if (el.placeholder) el.placeholder = sub(el.placeholder);
        }
        for (const el of document.querySelectorAll("[title], [aria-label], [alt]"))
          for (const a of ["title", "aria-label", "alt"]) if (el.hasAttribute(a)) el.setAttribute(a, sub(el.getAttribute(a)));
        document.title = sub(document.title);
      }
      for (const s of hide) for (const el of document.querySelectorAll(s)) el.style.visibility = "hidden";
      for (const s of blur) for (const el of document.querySelectorAll(s)) el.style.filter = "blur(7px)";
    },
    [{ ...(config.replace || {}) }, config.hide || [], config.blur || []],
  );
}

/** Text a reader could see (body text, field values, title) — what the forbid patterns are checked against. */
const visibleText = () =>
  page.evaluate(() => {
    const vals = [...document.querySelectorAll("input, textarea")].map((el) => `${el.value} ${el.placeholder || ""}`);
    return `${document.title}\n${document.body.innerText}\n${vals.join("\n")}`;
  });

/**
 * Named boxes in screenshot css px. Only rendered, visible elements on the captured area count (a child
 * of a closed <details>, a hidden tab or an element scrolled away is skipped).
 *   "name": "selector"                      the first visible match
 *   "row-*": "selector"                     every visible match → row-<data-id | index>
 *   "name": { selector, text }              the run of `text` inside the first match (a phrase in a
 *                                           paragraph — loupe focus and cursor without eyeballing)
 */
async function measure(spec, full) {
  return page.evaluate(
    ([spec, full]) => {
      const out = {};
      const sx = full ? scrollX : 0;
      const sy = full ? scrollY : 0;
      const W = full ? document.documentElement.scrollWidth : innerWidth;
      const H = full ? document.documentElement.scrollHeight : innerHeight;
      const put = (key, r) => {
        const x = r.left + sx;
        const y = r.top + sy;
        if (!r.width || !r.height || x + r.width <= 0 || y + r.height <= 0 || x >= W || y >= H) return false;
        out[key] = { x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height) };
        return true;
      };
      const visible = (el) => (el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : el.offsetParent !== null);
      for (const [name, sel] of Object.entries(spec)) {
        if (sel && typeof sel === "object") {
          // A text run: the Range around the first occurrence of `text` inside the selector.
          for (const root of document.querySelectorAll(sel.selector || "body")) {
            if (!visible(root)) continue;
            const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let hit = null;
            for (let n; (n = w.nextNode()) && !hit; ) {
              const i = n.nodeValue.indexOf(sel.text);
              if (i >= 0) hit = [n, i];
            }
            if (!hit) continue;
            const range = document.createRange();
            range.setStart(hit[0], hit[1]);
            range.setEnd(hit[0], hit[1] + sel.text.length);
            if (put(name, range.getBoundingClientRect())) break;
          }
          continue;
        }
        const all = [...document.querySelectorAll(sel)].filter(visible);
        if (name.endsWith("*")) all.forEach((el, i) => put(name.slice(0, -1) + (el.dataset.id || i), el.getBoundingClientRect()));
        else for (const el of all) if (put(name, el.getBoundingClientRect())) break;
      }
      return out;
    },
    [spec, full],
  );
}

/** PNG buffer → WebP file through Chrome's own encoder (no image library needed). */
async function saveWebp(png, file) {
  const data = await enc.evaluate(
    async ([b64, q]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", q).split(",")[1];
    },
    [png.toString("base64"), quality],
  );
  fs.writeFileSync(file, Buffer.from(data, "base64"));
}

const manifest = {
  version: 1,
  captured: config.captured || new Date().toLocaleDateString("sv-SE"), // local YYYY-MM-DD
  host: config.host || "",
  shots: only ? { ...old.shots } : {},
  seqs: only ? { ...(old.seqs || {}) } : {},
};
const failures = [];
// Relative urls resolve like links: give a server base with a trailing slash ("http://127.0.0.1:5173/").
const resolveUrl = (u) => new URL(u, config.base).href;
const displayPath = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === "file:" ? x.hash || "/" : `${x.pathname}${x.search}${x.hash}`;
  } catch {
    return "";
  }
};

async function frame(key, shot) {
  await redact();
  if (shot.settle ?? config.settle) await page.waitForTimeout(shot.settle ?? config.settle);
  const text = await visibleText();
  const hit = forbid.find((re) => re.test(text));
  if (hit) {
    failures.push(`${key}: forbidden pattern ${hit} still on screen — extend config.replace / hide`);
    return false;
  }
  // fullPage: the whole scrollable page in one capture, so the camera can travel down a long screen.
  const full = Boolean(shot.fullPage);
  const boxes = await measure({ ...(config.boxes || {}), ...(shot.boxes || {}) }, full);
  const png = await page.screenshot({ type: "png", fullPage: full });
  const file = `${key}.webp`;
  await saveWebp(png, path.join(outDir, file));
  const vp = page.viewportSize();
  const size = full ? await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]) : [vp.width, vp.height];
  manifest.shots[key] = { file, w: size[0], h: size[1], path: shot.path ?? displayPath(page.url()), boxes };
  return true;
}

for (const shot of config.shots) {
  if (only && !only.includes(shot.key)) continue;
  process.stdout.write(`· ${shot.key} `);
  // A screenshot taken elsewhere (a phone, a tool you cannot run here): transcode it and record its size.
  if (shot.image) {
    const src = path.resolve(cfgDir, shot.image);
    const buf = fs.readFileSync(src);
    const file = `${shot.key}.webp`;
    await saveWebp(buf, path.join(outDir, file));
    const size = await enc.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, buf.toString("base64"));
    const k = shot.scale ?? scale;
    manifest.shots[shot.key] = { file, w: Math.round(size[0] / k), h: Math.round(size[1] / k), path: shot.path || "", boxes: shot.boxes || {} };
    console.log("(image)");
    continue;
  }
  if (shot.viewport) await page.setViewportSize(shot.viewport);
  else await page.setViewportSize(viewport);
  // A fresh document per shot: a hash-only change would keep the previous shot's focus, typed text and state.
  await page.goto("about:blank");
  await page.goto(resolveUrl(shot.url), { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts?.ready);
  const wait = shot.wait ?? config.wait; // per shot, else the config default
  if (typeof wait === "number") await page.waitForTimeout(wait);
  else if (wait) await page.waitForSelector(wait, { timeout: 30000 });
  if (shot.before) await shot.before(page);
  if (shot.type) {
    // Typing: one frame per `every` characters, from the empty field to the full text.
    const { selector, text, every = 1 } = shot.type;
    const keys = [];
    const steps = [];
    for (let i = 0; i <= text.length; i += every) steps.push(i);
    if (steps.at(-1) !== text.length) steps.push(text.length);
    for (const [n, i] of steps.entries()) {
      await page.fill(selector, text.slice(0, i));
      await page.waitForTimeout(shot.type.delay ?? 60);
      const key = `${shot.key}-${String(n).padStart(2, "0")}`;
      if (await frame(key, shot)) keys.push(key);
    }
    manifest.seqs[shot.key] = keys;
    console.log(`(${keys.length} frames)`);
  } else if (shot.record) {
    // Any other recording: record.step(page, i) advances the app one frame (stream a reply, drag, scroll).
    const keys = [];
    for (let i = 0; i < shot.record.count; i++) {
      if (i > 0 || shot.record.stepFirst) await shot.record.step(page, i);
      const key = `${shot.key}-${String(i).padStart(2, "0")}`;
      if (await frame(key, shot)) keys.push(key);
    }
    manifest.seqs[shot.key] = keys;
    console.log(`(${keys.length} frames)`);
  } else {
    console.log((await frame(shot.key, shot)) ? "" : "✗");
  }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
await browser.close();
const total = Object.values(manifest.shots).reduce((n, s) => n + (fs.existsSync(path.join(outDir, s.file)) ? fs.statSync(path.join(outDir, s.file)).size : 0), 0);
console.log(`${Object.keys(manifest.shots).length} shots · ${(total / 1048576).toFixed(1)} MB · ${manifestPath}`);
if (logs.length) console.log(logs.join("\n"));
if (blocked.length) console.log(`read-only: blocked ${blocked.length} request(s)\n  ${[...new Set(blocked)].slice(0, 12).join("\n  ")}`);
if (failures.length) {
  console.error(`\nNOT SAVED (forbidden text still visible):\n${failures.join("\n")}`);
  process.exit(1);
}
