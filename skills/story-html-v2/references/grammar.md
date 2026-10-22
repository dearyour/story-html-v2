# story-html-v2 — the design system in full

The floor, the ceiling, the layers, the chapter grammar, the API, tokens, pitfalls and checks.
SKILL.md has the workflow; [capture.md](capture.md) has the capture pipeline and redaction.

**Contents**
1. What v2 is · 2. The floor · 3. The ceiling · 4. Hard rules · 5. Page layers · 6. Chapter grammar ·
7. API · 8. Tokens · 9. Mobile · reduced motion · 10. Pitfalls · 11. Verification · 12. Embedding ·
13. Parallel chapter builders

## 1. What v2 is

A scroll story where **the product's real screens are the protagonist**. Each chapter shows one
captured screen inside a browser window; a camera flies over the capture to exactly where the reader
should look, a ring marks it, a demo cursor presses what the step describes, recorded frames play
typing and streaming as a flipbook, and a dark panel under the window draws *how* the screen works as
a motion graphic. Beside it, the copy column carries the claim and quotes the source line the step
proves. The reader understands what was built and how — by scrolling alone.

Lineage: v1 (`story-html`) rebuilt every product screen as an HTML mock. v2 came from an internal-tool
introduction page (14 chapters, 143 captures, 2026-10-21/22) that kept v1's stage, layers and copy
grammar but replaced the mocks with **real pixels under a camera** and the text panels with **Graph
motion graphics**. Pixels are evidence: nothing on the product screen is redrawn or invented.

When the product cannot be run (a past employer's app, a native tool, a deleted service), write a
reconstruction page in the product's style and capture it exactly the same way — then the stamp says
`재구성 화면`, not a capture date (capture.md §5).

## 2. The floor — missing any of these means unfinished

1. **Real captures are the protagonist.** Each product chapter is an `AppChapter`: a browser window
   (`1000×610` design, dark navy chrome, traffic lights, address bar showing host + path) over the
   captured screen, taking the right side of a split layout. Never cards, widgets or an explanation
   panel standing in for the product; never a hand-redrawn copy of a screen you could capture.
2. **The camera directs the eye.** One camera key per thing to look at, flying between keys around
   each step boundary. Desktop framing never narrower than **1060 capture px** (sidebar, header and
   neighbouring columns stay in view — the user rejected deeper zooms: 「너무 확대돼서 어디서 어디를
   선택했는지 가늠이 안 됨」). Detail that needs reading gets a **loupe** (`mark.lens`), not more zoom.
3. **Marks** — a ring with a short label pill on the element the step is about; `spot` dims the rest
   for the decisive one. Marks show only while the camera holds still on their shot.
4. **Demo cursor** in capture coordinates: it clicks just before the screen changes, types, opens,
   confirms. Short labels ("검색", "열기", "확인"). A human decision (merge, pay, refund) is still
   performed by the cursor on scroll.
5. **Recorded frames, not redrawn text.** Typing, streaming replies, progress — record one frame per
   change (`capture.mjs` `type` / `record`) and play them with `seq()`. Never type text over a capture.
6. **Mechanism panel = motion graphic.** The dark panel under the window (`Mech` + `Graph`) draws the
   mechanism as nodes, edges, packets riding paths, counts drawn as cells, strokes drawing themselves —
   a pure function of the step and its local progress. Rows of text are the fallback, not the default
   (the reference switched every panel to Graph after text rows read as filler).
7. **Source quote per step** (`cite`, label from `--cite-label`), verbatim. Every source line appears
   somewhere. Titles are claims about the product, two lines, one `<em>` in signal.
8. **One protagonist** object (an issue id, an order, a query) travels through every chapter.
9. **The opening interprets the content** (§6.4) and the **end** offers the way out plus a contact
   sheet of every screen used, each jumping back to its step (§6.5).
10. **Fixed layers** (§5): HUD, corner brackets, rail with hex-decode wipe, readout, grain, capsule.
11. **Honesty.** Stamp every product with its capture date (`2026-10-23 화면`) or `재구성 · …` for
    reconstructions and staged states. Counts on the page are what the captures show. Unmeasured stays
    `측정 전`. Public pages: identifying text rewritten at capture time, forbidden patterns 0, grep 0.
12. **Modes.** Reduced motion shows each step settled (`SETTLE[s]`); phones (< 820px) get one column,
    a 380-wide window with phone crops (`mw/mx/my`), and the phone Graph; body ≥ 16px, labels ≥ 13px.

## 3. The ceiling — required on every page

The reference page and the starter are **the floor, not the ceiling.** Copying the starter and
swapping captures is unfinished. Every page makes **at least two things neither had**:

- **(a) A signature scene** only this content could have — usually the opening or the most important
  chapter. (Reference: real list titles from seven services float, sort into seven lanes counting up
  to the numbers the app shows, fold into the seven cards of the real window, which then plays the
  app's own first-visit boot. Starter: twelve order lines land on their measured rows and the capture
  surfaces under them.) Do not reuse either.
- **(b) One step above the floor** in camera, transition, material, light, type, physics or the
  mechanism graphic.

| Direction | Floor (reference · starter) | Raised — examples, invent your own |
| --- | --- | --- |
| Camera | 2D pan/zoom + crossfade between captures | perspective tilt into the screen; a dolly *through* a clicked row into the next capture; parallax by lifting measured boxes onto separate depth layers |
| Transition | capsule flies to the next kicker | the measured element of one capture becomes the first element of the next (match cut by boxes); the window flips to show the mechanism on its back |
| Material | crossfade, loupe | a measured region peels off the capture as a card and flies into the Graph; before/after captures wiped by a scan line that reads the diff |
| Recording | flipbook of typed frames | scrub-able timeline of a long recording with chapter marks; split screen of two recordings in lockstep |
| Mechanism | Graph nodes, packets, counters | the Graph and the capture share coordinates — a packet leaves the real button and lands in the panel; counts that are the real list rows, not dots |
| Type | title swap per step | a headline word lands in the capture as the searched text; the quote flows into the screen as data |
| Light | ring glow, spot dim | depth-of-field blur outside the mark, light sweep across the real UI, bloom on the decisive button |

Report "**바닥 대비 새로 만든 것**" (scene, effect, where) at the end.

## 4. Hard rules

- **Scroll alone tells the whole story.** Never gate content behind an action. Direct manipulation is
  an optional extra that resets when the step changes.
- **Native scroll only**, no scroll-jacking. State = f(p): rewind, reload or a rail jump give the same
  frame. Time (`Engine.t`) only drives ambient life and stops under reduced motion.
- **Readability beats spectacle.** Nothing bright moves behind text; motion never has to finish before
  the content reads; labels never cover the thing they name.
- **No glyph emoji in SVG** (the font subset renders some as boxes) — draw checks/crosses/locks with
  `G.check/cross/lock`. Circled digits ①–⑤ render as "⊙"; use plain digits.
- **No motion-stop button.** Reduced motion follows the OS setting only.
- **No slogans.** Titles claim something about the product.

## 5. Page layers (base.css + boot.js) — unchanged from v1

| Layer | Behaviour |
| --- | --- |
| HUD (60px) | brand `NAME / WORD` (signal slash) · meta · `05 / 11 NAME` · source/CTA capsule |
| Rail (right) | one dash per rail mark; jumps > 1.5 screens use the hex-decode wipe. Labels never take clicks |
| Readout | left: `data-org · data-period`; right: `P 0.500 · 05 desc` |
| Capsule | the next chapter's name flies from the previous product into the new kicker (desktop) |
| Texture | grain overlay, four corner brackets |
| Toasts | product-notification style, forward scroll only (`Toast.show(text, color)`) |

## 6. Chapter grammar

### 6.1 The product chapter (`AppChapter`)
- Layout `split`: copy column left (ghost numeral → kicker `05 —— NAME` → meta → two-line title →
  body → step list with progress underline → source quote), product right.
- Product canvas `1000 × 850` = window `610` + gap `16` + mechanism panel `224` (phones `380 × 562`).
  It fills the 1440×900 split box at ≥ 0.85 scale — keep it; `check.mjs` reports `lowFill`.
- Window without a panel (`AppChapter(…, false)`): the window takes the capture's 16:10 aspect and
  sits centred in the same canvas, leaving stage above/below for what the chapter stages around it.
- Under the window, right: the stamp (`● 2026-10-23 화면` / `● 재구성 · 커밋 직후`). Inside the view,
  bottom-left: the caption pill (`key.cap`), e.g. `d1012c84 · 커밋 완료`.

### 6.2 Camera choreography
- Keys are framings: `{ at, shot, box: "name", w }` centres on a measured element (preferred), or
  `{ at, shot, x, y, w }` (top-left of the framed rect). `dx/dy` nudge; `w` ≥ 1060 on desktop.
- The camera blends over ≈ 0.05 of p around each key's `at` (55% before, 45% after) and crossfades
  captures when the shot changes. Put a key at each step boundary; add mid-step keys when the step
  moves to another region (e.g. drawer → toast).
- Keep the framed region containing every mark of that moment — a mark half outside the view reads as
  a bug. If an element sits at the edge, frame it with `dx/dy`, or mark a smaller inner box.
- Cursor: arrive (`label`), dwell (`hold: 0.06` keeps it and its label in place before leaving), `click:
  true` 0.015–0.03 before the key that shows the result. `hide: true` parks it invisibly. Box cursor keys
  resolve on the shot the camera holds at that `at`.
- A single dense screen leaves the camera nowhere to go: at 1060 wide a 1440×900 capture only shows
  ~610 px of height, so keys clamp to the same frame (AppCam warns: "land on the same frame"). Capture it
  `fullPage` so the camera can travel down it, or stay put and let marks + loupes move instead.
- Phones: each key gets `mw` (≤ 760) and `mx/my` (crop centre) — defaults come from the box. Loupes
  are hidden on phones (the crop is already close).

### 6.3 The mechanism panel (`Mech` + `Graph`)
Draw what the screen does underneath: the state it moves through, what travels where, what is counted.
Motifs from the reference — invent per content:
slot map (which slot holds which repository), signal lanes (one cell per log line, counted up),
chain flow (input → send → answer with a riding packet), file-tree fan-out (+/− per file), git lanes
(target / origin / local; a merge curve with a packet; MR chip; human merge with a check), token path
(this PC's files → names-only scan → a lock → service sockets; a crossed path to "screen · log · URL"
that never receives anything), order state machine (starter: request → processing → done fanning
out to the three places that must agree).
Rules: the panel's title is mono caps (`ORDER STATE`), its caption changes per step (`A.mech.cap`).
Every node/edge belongs to a step (`data-on`, `data-now`, `g-dim` while waiting, `g-fade` once
passed). Ids carry the chapter prefix. Phones get their own simpler SVG (380×216).

### 6.4 The opening
Interpret the content: the same objects first appear loose, then become the product. Reference and
starter patterns are in §3(a) — make a new one. Use measured boxes so the loose objects land exactly
where the capture shows them, and keep identity (the same rows, ids, numbers).

### 6.5 The end
The way out (install command with copy buttons, link, plugin lines — whatever the reader does next),
a short numbered "start" list, and the contact sheet: every capture the page used as a thumbnail with
a caption; clicking scrolls to the step that shows it (`Engine.scrollToScene(id, p)`).

## 7. API

Engine globals (engine.js): `clamp lerp seg $ $$ fmt rng hash decode E.(reveal|lock|stamp|travel|out|inOut)
Toast Engine.{t, reduce, mobile, vw, vh, scrollToScene(id,p)}`. Scene object in `update(p, scene)`:
`scene.p`, `scene.enter`, `scene.el`.

Kit (kit.js): `Chapter(id, { layout, ctx, link, kicker, steps })` → `{ product, step(p), local(p) … }`;
`Fit(box, w, h, { mobile })`; `DemoCursor` (for non-capture products); `simStamp`; change-guarded
`toggle setText setHTML setVar setAttr`; `stepOf typed counted el esc`.

Shots (embedded by build.mjs from `shots/manifest.json`):
- `SHOTS[key] = { src, w, h, path, boxes }` (css px of the capture) · `SEQS[name] = [frame keys]` ·
  `CAPTURE = { captured, host }`.
- `box(shot, name | [names], pad)` → `{x,y,w,h}` (an array gives the union — a ring around a run of
  rows) · `spot(shot, name, dx, dy)` → `{x,y}` centre ·
  `seq(name, a, b)` → `[{ at, shot }]` frames spread over p ∈ [a, b]. Unknown names log
  `console.error`, which `check.mjs` reports — fix them, never ignore.

App (app.js):
- `AppChapter(id, steps, cam, mechTitle | false, mechSub, { ctx, stamp, layout })` →
  `{ C, fit, app, mech, resize() }`.
- `AppCam(host, def)` → `{ node, update(p), resize(mobile), project(x, y), camera }`. `def`:
  `keys`, `marks` (`{ from, to, shot, box | x,y,w,h, pad, label, c, below, right, spot, lens,
  lensBox | lensFocus:[fx,fy], lensSize }`), `cursor` (`{ at, box | x,y, dx, dy, label, click, hide,
  hold }`), `sequence`, `minW`, `host`, `size`/`msize`.
  `project(x, y)` maps capture px → window px under the current camera (overlays outside the world).
- `A.toCanvas(x, y)` (capture px → canvas px, through the camera) and `A.fromGraph(x, y)` (Graph viewBox
  px → canvas px) put an overlay in `A.fit.inner` that travels between the window and the panel — e.g.
  a measured region of the capture peeling off and landing on a Graph node.
- Sequences: the recording covers the key shots from its first frame; its last frame holds until the
  camera leaves for a key placed after it (fading with that move) — no older shot flashes in between.
- `Mech(host, title, sub)` → `{ body, cap(text) }` · `mechRows(rows)` + `lightRows(body, s)` (fallback).
- `Graph(host, { svg, mobile })` → `{ update(s, k), resize() }`; attributes: `data-on="2" | "2-4"`,
  `data-now="3 5"`, `data-draw="2:0.1-0.7"`, `data-along="id" data-at="3:0-0.6"` (+ `data-stay`,
  `data-wait`, `data-back`, `data-loop="3"`), `data-count="1:0-47"`, `data-type="4"`,
  `data-decode="4"`, `data-k="2:0.2-0.8"` (→ `--k` for `.g-bar` / `.g-in` / `.g-out`).
- `G.chip(x, y, label, { w, h, c, on, now, cls, sub, dot, mono, id })`, `G.edge(d, { id, c, on, draw, cls })`,
  `G.packet(alongId, at, { label, w, r, c, stay, wait, back, loop })`, `G.check/cross/lock(x, y, c)`.

Chapter module: `const ChName = (() => { …; return { build, resize, update }; })();` — template in
`src/chapters/_template.js`.

## 8. Tokens

| Role | Value |
| --- | --- |
| Stage | `--void #000` · `--bg #0a0a08` · surfaces `--s1..s3` · chapter stages: dark radial (`#0d0f1a → #000`) |
| Ink | `--ink #efeadc` · `--ink2 #c9c3b0` · `--ink3 #a59f8b` · lines `--line/.12` `--line2/.22` |
| Signal | `--signal #ff5a2a` (marks, now-node, kicker) · `--amber` waiting/request · `--mint` done · `--blue` · `--ion` · `--gold` human/approval · `--err` |
| Window | chrome `#0d1020` / bar `#161a2c`, 1px `rgba(160,175,230,.22)` edge + blue ambient glow; URL host bold, path amber |
| Panel | `#0c0c0a`, mono caps title in signal, nodes `#141310` with `--c` strokes |
| Type | Pretendard (copy) · JetBrains Mono (HUD, kicker, panel, labels) · Instrument Serif italic (one line at most) |
| Curves | reveal (.2,.7,.1,1) · lock (.7,0,.2,1) · stamp (.3,1.6,.4,1) · travel (.65,0,.35,1) |

## 9. Mobile · reduced motion

- Phones: one column, window 380×300 over a 250-tall panel; keys crop with `mw/mx/my`; marks keep
  their labels; the cursor still moves; loupes hidden; phone Graph SVG. End chapter `height: auto`.
- Reduced motion: `A.app.update(Engine.reduce ? SETTLE[s] : p)` — the camera snaps, sequences show
  the frame at that settled p (put a step's SETTLE after its recording's last frame to show the typed
  result), cursor hidden, Graph strokes drawn and counts final, opening shows its settled state.

## 10. Pitfalls already hit

- **Over-zoom loses context** (user correction) → minW 1060 + loupe.
- **Hash-only navigation keeps state** between shots (focus, typed text) → capture.mjs loads
  `about:blank` before every shot. Do the same in custom `before` steps that reuse the page.
- **UTC dates** stamp yesterday after midnight → capture date is local.
- **Wide marks + loupe** magnify the middle of nothing → measure the phrase as a text-run box
  (`{ selector, text }`) and point `lensBox` at it.
- **Labels outside the view** (a row wider than the framing) → put the label on a smaller box inside.
- **A parked packet covers a node's label** → let it ride and vanish, or park it on the edge, and
  write the value as text above the edge.
- **Three-line titles** squeeze the step list; **Graph chip labels wider than the chip** (often on
  phones) → check.mjs logs both (`[title]`, `[chip]`); shorten the line or widen the chip.
- **A live tool mutated by capturing** (typing into a field that autosaves, a button that recomputes) →
  capture.mjs is read-only by default; keep it so for anything that is someone's real data.
- **Shot keys built with template literals** defeat build pruning (`keys` are found as quoted strings)
  → name them literally or build with `--all-shots`.
- **Size**: a 2× WebP of a dense UI is 100–150 KB; 140 captures ≈ 15 MB. Prune unused shots, prefer
  `scale: 1.5` for long recordings.
- **Derived identifiers survive redaction**: replacing a full name leaves its avatar initial, email
  local-part, URL slug or ticket prefix → add the derived forms to the dictionary or hide the element,
  and look at every shot (capture.md §3).
- Class collisions with globals (`.sr .rail .ring .tag .ac* .mech* .g-*`) → prefix chapter classes.
- Measuring in `update()` janks → measure in `resize()` (`offsetTop`, boxes are precomputed).
- `</script>` / `</style>` inside strings breaks the single-file build (build.mjs throws).

## 11. Verification

```bash
node capture.mjs                                   # shots/ + manifest (re-run after app changes)
node build.mjs --only=<id> --out=dist/<id>.html
node check.mjs "file://$PWD/dist/<id>.html" check/<id>/desk 1440 900 "<id>:0.03,0.15,0.3,0.45,0.6,0.75,0.9"
node check.mjs "file://$PWD/dist/<id>.html" check/<id>/small 1280 720 "<id>:0.1,0.5,0.9"
node check.mjs "file://$PWD/dist/<id>.html" check/<id>/mobile 390 844 "<id>:0.1,0.4,0.7,0.95"
REDUCE=1 node check.mjs "file://$PWD/dist/<id>.html" check/<id>/reduce 1440 900 "<id>:0.2,0.8"
node check.mjs "file://$PWD/dist/index.html" check/joins 1440 900 "<id2>@enter:0.5;<id3>@enter:0.5"
```

Open the PNGs yourself. Look for: marks inside the view and on the right element at every step,
cursor on its target when it clicks, captions/labels not covering what they name, loupes reading the
words that matter, the Graph state matching the step, no hollow panel. `_log.txt` must be empty
(console errors — unknown shots/boxes/paths —, camera keys landing on the same frame, 3-line titles,
overflowing chip labels and horizontal overflow are logged). `lowFill` empty.
Public page: `capture.mjs` forbidden-pattern failures 0, grep of `src/` and `shots/manifest.json` 0,
and every shot looked at.

## 12. Embedding

One self-contained HTML (captures inlined). Ship it as a static file in the app's public folder at a
clean route, or framed under the site header via an iframe of a document route (links get
`target="_top"`). Keep the redaction dictionary and raw captures out of any public repository.

## 13. Parallel chapter builders

Capture first (shared `shots/` and manifest), then write shared files (page.html sections, data.js,
app tweaks), then give each chapter to its own agent with `contract-template.md` filled in. Each agent
owns only `src/chapters/<id>.{js,css}`, may request new shots/boxes in its report instead of editing
`shots.config.mjs`, builds `--out=dist/<id>.html`, captures into `check/<id>/`. Integrate: full
build, joins, mobile/reduce sweep, grep, publish.
