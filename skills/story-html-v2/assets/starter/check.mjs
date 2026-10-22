// Frame checker: scroll to exact chapter progress values, screenshot each, build a contact sheet.
// usage: node check.mjs <url> <outDir> <width> <height> "<id>:p,p,p;<id>@enter:p"
//   p = progress through the pinned chapter; "@enter" = progress while the chapter scrolls in.
//   REDUCE=1 → prefers-reduced-motion. WAIT=ms per frame (default 1400).
// Also reports how much of each chapter's product box the Fit canvas fills (desktop widths): a
// fill under 80% (or, at 1440×900-class heights, a scale under 0.85) means the design size does not match the box aspect —
// empty bands around the product and shrunken labels. Listed in _fill.txt and as "lowFill".
// Needs playwright-core and an installed Google Chrome (no browser download). It is looked up in
// $PW_DIR, then ~/.cache/story-html-pw, then this folder. One-time setup:
//   mkdir -p ~/.cache/story-html-pw && cd ~/.cache/story-html-pw && npm init -y >/dev/null && npm i playwright-core
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const roots = [process.env.PW_DIR, path.join(os.homedir(), ".cache/story-html-pw"), path.dirname(new URL(import.meta.url).pathname)].filter(Boolean);
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

const [url, out, w = "1440", h = "900", spec = ""] = process.argv.slice(2);
const width = +w;
const height = +h;
fs.mkdirSync(out, { recursive: true });
const FRAMES = spec
  .split(";")
  .filter(Boolean)
  .map((part) => {
    const [id, ps] = part.split(":");
    return [id, ps.split(",").map(Number)];
  });
const wait = +(process.env.WAIT || 1400);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 820, reducedMotion: process.env.REDUCE === "1" ? "reduce" : "no-preference" });
const logs = [];
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
const shots = [];
const fills = [];
for (const [id, ps] of FRAMES) {
  for (const p of ps) {
    const y = await page.evaluate(
      ([id, p]) => {
        const [sid, mode] = id.split("@");
        const el = document.getElementById(sid);
        if (!el) return -1;
        const top = el.getBoundingClientRect().top + scrollY;
        const y = mode === "enter" ? Math.round(top - innerHeight * (1 - p)) : Math.round(top + Math.max(0, el.offsetHeight - innerHeight) * p);
        scrollTo(0, y);
        return y;
      },
      [id, p],
    );
    await page.waitForTimeout(wait);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) logs.push(`[overflow] horizontal overflow at ${id} p=${p}`);
    // Layout lint: a title past two lines squeezes the step list; a Graph chip label wider than its chip.
    const lint = await page.evaluate((sid) => {
      const out = [];
      const sc = document.getElementById(sid.split("@")[0]);
      if (!sc) return out;
      for (const h2 of sc.querySelectorAll(".h2")) {
        const lh = parseFloat(getComputedStyle(h2).lineHeight);
        const lines = lh ? Math.round(h2.offsetHeight / lh) : 0;
        if (lines > 2) out.push(`[title] ${lines} lines: "${h2.textContent.trim().slice(0, 40)}"`);
      }
      for (const n of sc.querySelectorAll(".gx .g-n")) {
        const rect = n.querySelector(".g-b");
        if (!rect) continue;
        const rb = rect.getBBox();
        for (const t of n.querySelectorAll(".g-t")) {
          const tb = t.getBBox();
          if (tb.width && (tb.x < rb.x + 2 || tb.x + tb.width > rb.x + rb.width - 4)) out.push(`[chip] label overflows its chip: "${t.textContent.trim()}"`);
        }
      }
      return out;
    }, id);
    for (const msg of lint) if (!logs.some((l) => l.endsWith(`${msg} (${id.split("@")[0]})`))) logs.push(`${msg} (${id.split("@")[0]})`);
    if (width >= 820) {
      const fill = await page.evaluate((sid) => {
        const el = document.getElementById(sid.split("@")[0]);
        const box = el?.querySelector(".ch-product")?.getBoundingClientRect();
        const fit = el?.querySelector(".ch-product .fit");
        if (!box || !fit || !box.width || !box.height) return null;
        const r = fit.getBoundingClientRect();
        const area = (Math.min(r.width, box.width) * Math.min(r.height, box.height)) / (box.width * box.height);
        return { area: +area.toFixed(2), scale: +(+getComputedStyle(fit).getPropertyValue("--fit") || 1).toFixed(2) };
      }, id);
      // Scale is judged at full desktop height only; 1280×720 legitimately shrinks to ~0.7–0.8.
      if (fill && (fill.area < 0.8 || (height >= 860 && fill.scale < 0.85))) fills.push(`${id} p=${p} fill ${Math.round(fill.area * 100)}% scale ${fill.scale}`);
    }
    const file = path.join(out, `${id.replace("@", "-")}_${String(Math.round(p * 100)).padStart(3, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push({ file, label: `${id} p=${p} y=${y}` });
  }
}
const cols = width < 820 ? 5 : 3;
const tw = width < 820 ? 300 : 600;
const th = Math.round((tw * height) / width);
const sheet = path.join(out, "_sheet.html");
fs.writeFileSync(
  sheet,
  `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#222;color:#ddd;font:13px monospace;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px;padding:6px;width:${cols * tw + (cols + 1) * 6}px}figure{margin:0}img{display:block;width:${tw}px;height:${th}px}figcaption{padding:3px}</style>` +
    shots.map((s) => `<figure><img src="${pathToFileURL(s.file).href}"><figcaption>${s.label}</figcaption></figure>`).join(""),
);
const sp = await browser.newPage({ viewport: { width: cols * tw + (cols + 1) * 6, height: 600 } });
await sp.goto(pathToFileURL(sheet).href);
await sp.waitForTimeout(500);
await sp.screenshot({ path: path.join(out, "_sheet.png"), fullPage: true });
fs.writeFileSync(path.join(out, "_log.txt"), logs.join("\n"));
fs.writeFileSync(path.join(out, "_fill.txt"), fills.join("\n"));
console.log(JSON.stringify({ shots: shots.length, errors: logs.length, logs: logs.slice(0, 8), lowFill: [...new Set(fills.map((f) => f.split(" p=")[0] + " " + f.split(" fill ")[1]))].slice(0, 8) }, null, 1));
await browser.close();
