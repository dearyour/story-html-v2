# Capturing the product — capture.mjs

The page's product screens are real screenshots. This file covers how to take them so they are
reproducible, anonymised and precisely addressable.

**Contents** 1. Setup · 2. shots.config.mjs · 3. Redaction for public pages · 4. Recordings ·
5. Reconstructions and screens you cannot run · 6. Manifest and build · 7. Checklist

## 1. Setup

- Run the product where Chrome can reach it: a local dev server (`http://127.0.0.1:5173/`), a staging
  URL, or a static page (`file://…`). Seed it with the data the story needs — one protagonist object
  and enough surrounding rows that the screen looks in use.
- Logged-in apps: save a session once (Playwright `storageState`) and pass it through
  `context: { storageState: "auth.json" }`. Keep that file out of every repository.
- `playwright-core` + the installed Google Chrome, same as check.mjs:
  `mkdir -p ~/.cache/story-html-pw && cd ~/.cache/story-html-pw && npm init -y >/dev/null && npm i playwright-core`.

## 2. shots.config.mjs

```js
export default {
  base: "http://127.0.0.1:5173/",      // relative urls resolve like links (keep the trailing slash)
  host: "app.example",                  // shown in the window's address bar
  viewport: { width: 1440, height: 900 },
  scale: 2, quality: 0.82,              // saved WebP pixel ratio and quality
  context: {},                          // passed to Playwright (storageState, colorScheme, …)
  settle: 0,                            // ms to wait after redaction before each screenshot
  boxes: { search: "#q", "row-*": "tr[data-id]" },     // measured on every shot where present
  shots: [
    { key: "list", url: "orders" },
    { key: "detail", url: "orders/A-1031", wait: ".drawer", boxes: { refund: "#refundBtn" } },
    { key: "confirm", url: "orders/A-1031", before: async (page) => { await page.click("#refundBtn"); } },
    { key: "search", url: "orders", type: { selector: "#q", text: "A-1031", every: 1 } },
    { key: "reply", url: "chat/7", record: { count: 12, step: async (page, i) => { await page.click("#next"); } } },
    { key: "phone", image: "raw/phone-home.png", scale: 3 },  // a screenshot taken elsewhere
  ],
};
```

- `key` is what chapters reference. `url` (relative to `base`) or `image`.
- `wait`: a selector or milliseconds. `before(page)`: any steps to reach the state (click, fill,
  scroll, seed data via `page.evaluate`). Every shot starts from a fresh document.
- **Boxes**: name every element the story points at — camera targets, marks, cursor targets, loupe
  regions. A name ending in `*` measures every match and names it by `data-id` (or index):
  `row-*` → `row-A-1031`. Chapters use `box("detail", "refund")`; nothing is placed by eye.
- `node capture.mjs --only=detail,confirm` re-shoots some keys and merges them into the manifest.

## 3. Redaction for public pages

Capture-time rewriting replaces the old approach of OCR + pixel patching: the live DOM is rewritten
before the screenshot, so replaced text is drawn by the app's own fonts at the app's own positions.

- Put the real → fake dictionary and the forbidden patterns in **`redact.local.mjs`** next to the
  config (git-ignored; the dictionary itself names what it hides — never publish it):
  ```js
  export default {
    replace: { "Real Company": "가상 상점", "realco-web": "shop-web", "Kim Real": "한지우" },
    forbid: [/realco/i, "internal.realco.net", /RC-\d{4}/],
    hide: [".avatar img", ".org-logo"],
    blur: [".chart-legend"],
  };
  ```
- Replacement covers text nodes (including open shadow roots), input values and placeholders, `title` /
  `aria-label` / `alt`, and the document title. Longest keys win first.
- **It does not cover**: images (avatars, logos, screenshots inside the app, canvas charts), iframes,
  closed shadow roots, and **derived forms** — initials in avatar circles, email local-parts, URL slugs,
  ticket prefixes, monograms. Add derived forms to `replace`, or `hide`/`blur` the element.
- `forbid` is checked against the visible text after redaction; a shot that still contains a pattern
  is **not saved** and the run exits 1. It cannot see pixels — **look at every saved shot** before
  publishing.
- Keep counts and structure true (14 rows stay 14 rows); rename only identities. Keep the user's own
  name if they want it shown.

## 4. Recordings

- `type: { selector, text, every, delay }` records the field from empty to full, one frame per
  `every` characters → frames `<key>-00 … <key>-NN` and `SEQS[key]`.
- `record: { count, step(page, i), stepFirst }` records any progression (a streaming answer — poll the
  DOM between frames; a drag; a long scroll inside a pane).
- Play with `sequence: seq("search", 0.05, 0.16)` in the chapter's camera. Frames cover the key shots
  only between the first and last frame's `at`; keep a camera key on a matching shot around it.
- Real agent or network output: run it once for real, record, and stamp the chapter with that date
  (`2026-10-22 · 실제 요청·응답`). Do not fake a reply by typing text over a frame.

## 5. Reconstructions and screens you cannot run

- No runnable product (past employer, native app, retired service): write `recon/<screen>.html` in the
  product's style with the states the sentence implies, and capture those pages with the same config.
  The chapter stamp says `재구성 화면` and the copy never claims they are captures.
- A screenshot you already have (phone, design tool, a colleague's capture): `image:` with its pixel
  ratio as `scale`; add `boxes` by hand in css px of the image, or measure them once in a recon page.
- Mixed: real captures for what runs, reconstructions for the rest — each chapter's stamp tells which.

## 6. Manifest and build

`shots/manifest.json`: `{ captured, host, shots: { key: { file, w, h, path, boxes } }, seqs: { name: [keys] } }`.
`node build.mjs` embeds only shots referenced as quoted strings (or via a quoted sequence name) in
data.js / app.js / built chapters and prints what it left out; `--all-shots` embeds all. The address
bar shows `CAPTURE.host` + each shot's `path` unless a key gives its own `path`.

## 7. Checklist

- [ ] Every chapter's shots captured; `_log.txt` shows no unknown shot / box / sequence.
- [ ] Boxes for every camera target, mark, cursor target and loupe.
- [ ] Recordings play in order; the last frame matches the next key's shot.
- [ ] Public: `redact.local.mjs` git-ignored; forbidden-pattern failures 0; every shot looked at for
      images, initials, slugs; `grep -rniE "<patterns>" src shots/manifest.json` → 0.
- [ ] Capture date / reconstruction stamp on every product chapter.
