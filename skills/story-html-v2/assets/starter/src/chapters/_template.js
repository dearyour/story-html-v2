/* TEMPLATE (never built — files starting with "_" are skipped). Copy to src/chapters/<id>.js, rename the
   global to match the id (ch-foo-bar → ChFooBar), add a <!--ch-foo-bar--> … section to page.html, keep
   every CSS selector under #ch-foo-bar.

   A v2 chapter is the real product under a camera: capture the screens first (shots.config.mjs →
   node capture.mjs), then choreograph keys / marks / cursor over them by the boxes measured at capture
   time — box("shot", "name"), never coordinates read off a picture by eye. The panel under the window
   draws the mechanism as a Graph. Everything is a pure function of p; the story reads by scrolling alone
   (the demo cursor performs every decisive action). */

const ChExample = (() => {
  let A; // { C: Chapter, fit, app: AppCam, mech, resize() }
  let g; // Graph in the mechanism panel

  const STEPS = [
    // 4–7 steps. title: ≤ 2 lines, one <em>, a claim about the product. body: 1–2 sentences. cite: source line.
    { at: 0, label: "첫 단계", title: "<em>무엇을</em><br>하는 화면입니다.", body: "…", cite: note("sample", 0) },
    { at: 0.3, label: "두 번째", title: "…", body: "…", cite: note("sample", 1) },
    { at: 0.62, label: "세 번째", title: "…", body: "…", cite: note("sample", 2) },
  ];
  const SETTLE = [0.25, 0.58, 0.95]; // reduced motion: the settled p of each step
  const CAPS = ["…", "…", "…"]; // mechanism panel caption per step

  const CAM = {
    // Camera: one key per thing to look at. It flies between keys around each `at` (≈ 0.05 of p).
    keys: [
      { at: 0, shot: "list", box: "search", w: 1100 },
      { at: 0.3, shot: "detail", box: "drawer", w: 1100, cap: "pill text under the view" },
    ],
    // sequence: seq("search", 0.04, 0.2),   // recorded frames (typing, streaming) as a flipbook
    marks: [
      { from: 0.05, to: 0.3, shot: "list", box: "search", label: "여기", below: true },
      { from: 0.34, to: 0.6, shot: "detail", box: "amount", label: "금액", c: "var(--blue)", lens: 2 },
    ],
    cursor: [
      { at: 0.03, box: "search", click: true, label: "검색" },
      { at: 0.28, shot: "list", box: "row-A-1031", click: true, label: "열기" },
      { at: 0.4, shot: "detail", box: "refund", hide: true },
    ],
  };

  // The mechanism as a motion graphic: plain SVG + data-on / data-draw / data-along / data-count …
  // (see the Graph comment in app.js). Desktop viewBox 1000×188, phone 380×216; ids carry the chapter prefix.
  function graphic(m) {
    const w = m ? 380 : 1000;
    const h = m ? 216 : 188;
    let o = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    o += G.chip(m ? 80 : 200, m ? 60 : 94, "요청", { w: 140, c: "var(--amber)", on: "0", now: "0" });
    o += G.edge(m ? "M150 60H230" : "M270 94H430", { id: `ex-${m ? "m" : "d"}-e`, c: "var(--blue)", draw: "1:0-0.5" });
    o += G.packet(`ex-${m ? "m" : "d"}-e`, "1:0.1-0.7", { label: "34,000원", w: 84, c: "var(--blue)" });
    o += G.chip(m ? 300 : 500, m ? 60 : 94, "처리", { w: 140, c: "var(--blue)", on: "1", now: "1", cls: "g-dim" });
    return `${o}</svg>`;
  }

  function build() {
    A = AppChapter("ch-example", STEPS, CAM, "MECHANISM", "");
    g = Graph(A.mech.body, { svg: graphic(false), mobile: graphic(true) });
  }

  function resize() {
    A.resize(); // measure here, never in update()
    g.resize();
  }

  function update(p) {
    const s = A.C.step(p); // swaps title/body/cite, returns the step index
    A.app.update(Engine.reduce ? SETTLE[s] : p);
    g.update(s, A.C.local(p));
    A.mech.cap(CAPS[s]);
  }

  return { build, resize, update };
})();
