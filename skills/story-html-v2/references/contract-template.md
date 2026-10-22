# Chapter builder contract — template

Copy into the project as `CONTRACT.md`, replace `<skill-dir>` with this skill's folder, fill the `<…>`
parts, and hand each chapter agent:
"Read `<project>/CONTRACT.md` completely and follow it. Your chapter: `<id>` (global `<ChName>`)."

---

# <Page name> — chapter builder contract

## Request (user, <date>)
<the user's words, briefly — what the page is for and who reads it>

## 0. Read first (open images with the Read tool)
1. Design bar: `<skill-dir>/references/captures/` (all of them) and this project's `shots/*.webp`.
2. `<skill-dir>/references/grammar.md` (§2 floor, §3 ceiling, §6 chapter grammar, §7 API, §10 pitfalls)
   and `<skill-dir>/references/capture.md` §2–§4.
3. The starter chapters as technique reference: `<skill-dir>/assets/starter/src/chapters/ch-refund.js`
   (camera · marks · loupe · recording · Graph) and `ch-hero.js` (opening landing on measured boxes).
4. This project's shared code (read, use, do not edit): `src/engine.js`, `src/kit.js`, `src/app.js`,
   `src/app.css`, `src/base.css`, `src/data.js`, `src/page.html`, `src/boot.js`, `shots/manifest.json`.
5. Content sources: <paths to the README / notes / spec / résumé this page quotes>.

## 1. Own only your files
- `src/chapters/<id>.js` — `const <ChName> = (() => { …; return { build, resize, update }; })();`
- `src/chapters/<id>.css` — every selector starts with `#<id>`; prefix your classes.
- Need another shot or box? Ask in the report (key, url/state, selectors) — do not edit
  `shots.config.mjs`; the integrator captures.
- Build `--out=dist/<id>.html`, capture checks into `check/<id>/` only.

## 2. This page
- **Shots for this chapter**: <keys, sequences, the boxes they carry>.
- **Copy**: steps cite `note(key, i)` (label "<cite label>"). Lines to cite: <keys>. Titles ≤ 2 short
  lines with one `<em>`, body 1–2 sentences. Facts from data.js / captures only; unmeasured "측정 전".
- **Mechanism panel**: <what it must draw — states, flow, what is counted>, as a Graph.
- **Protagonist**: <the object that runs through all chapters>.
- **Public?** <yes/no>. Banned words: <…>. `grep -nE "<pattern>" src/chapters/<id>.*` → 0.
- **Ceiling**: this chapter's new thing beyond the floor: <assigned or "propose one">.

## 3. Chapter assignments
| id | global | steps (what the camera shows · what the cursor does · what the Graph does) | shots | cite |
|---|---|---|---|---|
| <ch-x> | <ChX> | <…> | <keys> | <keys> |

## 4. Verify before finishing
The commands in grammar.md §11 for your id; open every PNG; fix; re-capture. `_log.txt` empty,
`lowFill` empty, banned-word grep 0.

## 5. Report (last message, short)
Files · per step: camera target, mark, cursor action, Graph change · shots/boxes requested ·
verification (2–3 PNG paths, error count, grep) · remaining limits · "바닥 대비 새로 만든 것".
