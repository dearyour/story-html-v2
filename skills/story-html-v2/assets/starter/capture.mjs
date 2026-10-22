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

/** Named boxes in screenshot css px. A name ending in "*" measures every match: row-* → row-<data-id|index>. */
async function measure(spec) {
  return page.evaluate((spec) => {
    const out = {};
    for (const [name, sel] of Object.entries(spec)) {
      const els = name.endsWith("*") ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)].filter(Boolean);
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const key = name.endsWith("*") ? name.slice(0, -1) + (el.dataset.id || i) : name;
        out[key] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      });
    }
    return out;
  }, spec);
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
  const boxes = await measure({ ...(config.boxes || {}), ...(shot.boxes || {}) });
  const png = await page.screenshot({ type: "png" });
  const file = `${key}.webp`;
  await saveWebp(png, path.join(outDir, file));
  const vp = page.viewportSize();
  manifest.shots[key] = { file, w: vp.width, h: vp.height, path: shot.path ?? displayPath(page.url()), boxes };
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
  if (typeof shot.wait === "number") await page.waitForTimeout(shot.wait);
  else if (shot.wait) await page.waitForSelector(shot.wait, { timeout: 30000 });
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
if (failures.length) {
  console.error(`\nNOT SAVED (forbidden text still visible):\n${failures.join("\n")}`);
  process.exit(1);
}
