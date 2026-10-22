// Assemble src/ into one self-contained HTML page.
//   node build.mjs                          → dist/index.html (every chapter in page.html)
//   node build.mjs --only=ch-hero,ch-end    → only those chapters (their sections stay, others drop)
//   node build.mjs --out=dist/hero.html     → custom output path (relative to this folder)
//   node build.mjs --publish=<path.html>    → also copy the result there (e.g. a repo's public/)
//   node build.mjs --all-shots              → embed every captured shot, not only referenced ones
// Chapter order and module names come from the <!--ch-x--> markers in src/page.html:
// ch-foo-bar → src/chapters/ch-foo-bar.js defining `const ChFooBar = (() => …)()` and an optional
// src/chapters/ch-foo-bar.css that styles only `#ch-foo-bar`. Files starting with "_" are never built.
// src/app.js + src/app.css: the shared product layer (AppCam window over captured screens, mechanism
// panel, Graph). Loaded after data.js and the shots, before the chapters.
// shots/manifest.json + shots/*.webp (written by capture.mjs) become SHOTS · SEQS · CAPTURE. Only shots
// whose key (or sequence name) appears quoted in the built JS are embedded; --all-shots keeps all.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(dir, p), "utf8");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const moduleName = (id) =>
  `Ch${id
    .replace(/^ch-/, "")
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("")}`;

let page = read("src/page.html");
const ORDER = [...page.matchAll(/<!--(ch-[\w-]+)-->/g)].map((m) => m[1]);
const only = arg("only")?.split(",").filter(Boolean);
const chapters = ORDER.filter((id) => (!only || only.includes(id)) && existsSync(join(dir, `src/chapters/${id}.js`)));

// Drop the sections of chapters that are not built so the engine never sees an empty scene.
for (const id of ORDER) {
  if (chapters.includes(id)) continue;
  page = page.replace(new RegExp(`<!--${id}-->[\\s\\S]*?<!--/${id}-->\\n?`), "");
}
const chapterCss = chapters
  .map((id) => (existsSync(join(dir, `src/chapters/${id}.css`)) ? `/* ── ${id}.css ── */\n${read(`src/chapters/${id}.css`)}` : ""))
  .join("\n");
const optional = (p) => (existsSync(join(dir, p)) ? read(p) : "");
const appCss = optional("src/app.css");
const css = `${read("src/base.css")}\n${appCss ? `/* ── app.css ── */\n${appCss}\n` : ""}${chapterCss}`;
const registry = chapters
  .map((id) => `  ["${id}", typeof ${moduleName(id)} !== "undefined" ? ${moduleName(id)} : null],`)
  .join("\n");
const sources = [read("src/data.js"), optional("src/app.js"), ...chapters.map((id) => read(`src/chapters/${id}.js`))].join("\n");
function shotsModule() {
  const mf = join(dir, "shots/manifest.json");
  if (!existsSync(mf)) return `const SHOTS = {};\nconst SEQS = {};\nconst CAPTURE = { captured: "", host: "" };`;
  const m = JSON.parse(readFileSync(mf, "utf8"));
  const quoted = (key) => new RegExp(`["'\`]${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`).test(sources);
  const seqs = Object.fromEntries(Object.entries(m.seqs || {}).filter(([name]) => process.argv.includes("--all-shots") || quoted(name)));
  const keep = new Set(Object.values(seqs).flat());
  const shots = {};
  const dropped = [];
  for (const [key, s] of Object.entries(m.shots)) {
    if (!process.argv.includes("--all-shots") && !keep.has(key) && !quoted(key)) {
      dropped.push(key);
      continue;
    }
    const file = join(dir, "shots", s.file);
    if (!existsSync(file)) throw new Error(`shots/${s.file} is missing — run node capture.mjs`);
    shots[key] = { src: `data:image/webp;base64,${readFileSync(file).toString("base64")}`, w: s.w, h: s.h, path: s.path || "", boxes: s.boxes || {} };
  }
  const bytes = Object.values(shots).reduce((n, s) => n + s.src.length, 0);
  console.log(`shots: ${Object.keys(shots).length} embedded · ${(bytes / 1048576).toFixed(1)} MB${dropped.length ? ` · not referenced, left out: ${dropped.join(", ")}` : ""}`);
  return `/* Captured screens (capture.mjs, ${m.captured}). css px of the capture; boxes = named elements measured then. */
const SHOTS = ${JSON.stringify(shots)};
const SEQS = ${JSON.stringify(seqs)};
const CAPTURE = ${JSON.stringify({ captured: m.captured || "", host: m.host || "" })};`;
}
const parts = [
  ["engine", read("src/engine.js")],
  ["kit", read("src/kit.js")],
  ["data", read("src/data.js")],
  ["shots", shotsModule()],
  ...(optional("src/app.js") ? [["app", optional("src/app.js")]] : []),
  ...chapters.map((id) => [id, read(`src/chapters/${id}.js`)]),
  ["boot", read("src/boot.js").replace("/*__CHAPTERS__*/", () => registry)],
];
const js = `(() => {\n"use strict";\n${parts.map(([name, src]) => `/* ── ${name}.js ── */\n${src}`).join("\n")}\n})();`;
if (/<\/script/i.test(js)) throw new Error("script contains </script>");
if (/<\/style/i.test(css)) throw new Error("css contains </style>");
const html = page.replace("/*__CSS__*/", () => css).replace("/*__JS__*/", () => js);
const out = resolve(dir, arg("out") || "dist/index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out} · ${(html.length / 1024).toFixed(1)} KB · chapters: ${chapters.join(", ") || "none"}`);
const target = arg("publish");
if (process.argv.includes("--publish")) throw new Error("--publish needs a path: --publish=<file.html>");
if (target) {
  mkdirSync(dirname(resolve(target)), { recursive: true });
  copyFileSync(out, resolve(target));
  console.log("published →", resolve(target));
}
