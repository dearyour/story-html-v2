/* 01 REFUND — one refund, start to finish, on the real screens. The search box types A-1031 frame by
   frame (a recorded sequence, not redrawn text), the row opens the detail drawer where the request reason
   sits (loupe), the refund dialog shows the amount on its button, and after confirming three places agree
   — the drawer badge, the timeline and the customer notice. Every camera key, mark and cursor point is a
   box measured at capture time (shots.config.mjs), so nothing is placed by eye.
   Mechanism panel ORDER STATE: the query narrows 14 rows to 1 → 요청 → 처리 (a 34,000원 capsule rides
   across) → 완료, which fans out to the three places, then the request tab counts 2 → 1. */

const ChRefund = (() => {
  let A, g;
  const STEPS = [
    { at: 0, label: "검색", title: "주문번호를 치면<br><em>한 줄</em>만 남습니다.", body: "목록 위 검색칸에 A-1031을 칩니다. 한 글자마다 행이 줄어듭니다.", cite: note("refund", 0) },
    { at: 0.22, label: "상세", title: "요청 사유는<br><em>상세</em>에 있습니다.", body: "행을 누르면 오른쪽에 고객 · 상품 · 처리 기록이 열립니다." },
    { at: 0.44, label: "환불 창", title: "금액이 적힌<br><em>버튼</em>을 누릅니다.", body: "범위 · 금액 · 사유 · 재고 되돌리기를 한 창에서 확인합니다.", cite: note("refund", 1) },
    { at: 0.66, label: "완료", title: "세 곳이 같은<br><em>상태</em>를 가리킵니다.", body: "배지, 처리 기록, 고객 알림이 함께 환불 완료로 바뀝니다.", cite: note("refund", 2) },
    { at: 0.84, label: "남은 요청", title: "남은 요청은<br><em>한 건</em>입니다.", body: "환불 요청 탭에는 A-1024만 남았습니다." },
  ];
  // Reduced motion: one settled p per step (the end state of that step).
  const SETTLE = [0.165, 0.42, 0.62, 0.82, 0.97];
  const CAPS = ["검색칸 → 14행이 1행으로", "상태 · 환불 요청", "환불 처리 · 34,000원", "환불 완료 → 세 곳", "환불 요청 탭 2 → 1"];
  const CAM = {
    keys: [
      { at: 0, shot: "list", box: "search", w: 1100, dy: 200 },
      { at: 0.17, shot: "found", box: "hero", w: 1100, cap: "검색 결과 1건" },
      { at: 0.24, shot: "detail", box: "drawer", w: 1100 },
      { at: 0.31, shot: "detail", box: "request", w: 1060, dx: -140 },
      { at: 0.445, shot: "refund", box: "modal", w: 1100, my: 540 },
      { at: 0.665, shot: "done", box: "drawer", w: 1100, cap: "환불 완료 · 34,000원" },
      { at: 0.73, shot: "done", box: "toast", w: 1100, dx: -260, dy: -230, cap: "고객에게 알림 보냄" },
      { at: 0.845, shot: "requests", box: "tabs", w: 1200, dy: 120, cap: "환불 요청 탭" },
    ],
    sequence: seq("search", 0.05, 0.16),
    marks: [
      { from: 0.04, to: 0.165, shot: "list", box: "search", label: "주문번호 검색", below: true, c: "var(--ion)" },
      { from: 0.18, to: 0.235, shot: "found", box: "hero", label: "A-1031 한 줄", below: true, c: "var(--amber)" },
      { from: 0.32, to: 0.44, shot: "detail", box: "request", label: "요청 사유", c: "var(--amber)", lens: 1.7, lensBox: "reason" },
      { from: 0.47, to: 0.56, shot: "refund", box: "amountField", label: "금액", c: "var(--blue)", lens: 2, lensBox: "amountText", lensSize: 200 },
      { from: 0.56, to: 0.66, shot: "refund", box: "confirm", label: "34,000원 환불", below: true, spot: true },
      { from: 0.68, to: 0.725, shot: "done", box: "badge", label: "배지", below: true, c: "var(--mint)" },
      { from: 0.7, to: 0.84, shot: "done", box: "done", label: "처리 기록", right: true, c: "var(--mint)" },
      { from: 0.75, to: 0.84, shot: "done", box: "toast", label: "고객 알림", right: true, c: "var(--mint)" },
      { from: 0.86, to: 1.01, shot: "requests", box: "reqTab", label: "요청 1건", below: true, c: "var(--amber)" },
    ],
    cursor: [
      { at: 0.015, box: "search", dx: -140, click: true, label: "검색" },
      { at: 0.16, box: "search", dx: -140 },
      { at: 0.2, shot: "found", box: "hero", dx: -380, label: "열기" },
      { at: 0.225, shot: "found", box: "hero", dx: -380, click: true },
      { at: 0.38, box: "refund", label: "환불" },
      { at: 0.43, box: "refund", click: true },
      { at: 0.5, shot: "refund", box: "confirm", dx: 40 },
      { at: 0.6, shot: "refund", box: "confirm", dx: 40, label: "확인" },
      { at: 0.645, shot: "refund", box: "confirm", dx: 40, click: true },
      { at: 0.7, shot: "done", box: "badge", hide: true },
    ],
  };

  function graphic(m) {
    const w = m ? 380 : 1000;
    const h = m ? 216 : 188;
    const C = { req: "var(--amber)", proc: "var(--blue)", done: "var(--mint)" };
    let o = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    if (!m) {
      // query → 14 rows become 1
      o += `<g class="g-n is-on" transform="translate(115 62)" style="--c:var(--ion)"><rect class="g-b" x="-75" y="-21" width="150" height="42" rx="10"/><circle class="g-d" cx="-59" cy="0" r="4"/><text class="g-t" x="-45" y="5" data-type="0:0.12-0.7">A-1031</text></g>`;
      o += `<text class="g-t big" x="44" y="150" data-count="0:14-1">14</text><text class="g-t k" x="84" y="149">행 → 한 줄</text>`;
      o += G.edge("M190 62H255", { id: "rf-d-q", c: "var(--ion)", draw: "0:0.6-1" });
      o += G.packet("rf-d-q", "1:0-0.4", { r: 4, c: "var(--ion)" });
      // states
      o += G.chip(330, 62, "환불 요청", { w: 150, h: 46, sub: "사유 · 분쇄도", c: C.req, on: "1", now: "1", cls: "g-dim" });
      o += G.chip(560, 62, "환불 처리", { w: 150, h: 46, sub: "전액 · 재고 되돌림", c: C.proc, on: "2", now: "2", cls: "g-dim" });
      o += G.chip(780, 62, "환불 완료", { w: 140, h: 46, sub: "방금", c: C.done, on: "3", now: "3 4", cls: "g-dim" });
      o += G.edge("M405 62H485", { id: "rf-d-e1", c: C.proc, draw: "2:0-0.4" });
      o += G.packet("rf-d-e1", "2:0.1-0.7", { r: 5, c: C.proc, stay: true });
      o += `<text class="g-t c" x="445" y="38" text-anchor="middle" style="--c:${C.proc}" data-on="2" data-type="2:0.1-0.5">34,000원</text>`;
      o += G.edge("M635 62H710", { id: "rf-d-e2", c: C.done, draw: "3:0-0.25" });
      o += G.packet("rf-d-e2", "3:0-0.25", { r: 4, c: C.done });
      // fan-out to the three places that must agree
      const sinks = [[620, "상세 배지"], [780, "처리 기록"], [925, "고객 알림"]];
      sinks.forEach(([x, label], i) => {
        o += G.edge(`M780 85C780 112,${x} 108,${x} 134`, { id: `rf-d-s${i}`, c: C.done, draw: `3:${0.2 + i * 0.1}-${0.5 + i * 0.1}` });
        o += G.packet(`rf-d-s${i}`, `3:${0.25 + i * 0.1}-${0.55 + i * 0.1}`, { r: 4, c: C.done });
        o += `<g data-on="3" class="g-dim">${G.chip(x, 154, label, { w: 140, h: 34, c: C.done, cls: "on" })}${G.check(x + 52, 154)}</g>`;
      });
      // the request tab counts down
      o += G.edge("M850 62H872", { c: C.req, draw: "4:0-0.3" });
      o += `<g data-on="4">${G.chip(925, 62, "요청 탭", { w: 106, h: 40, c: C.req, cls: "on" })}</g>`;
      o += `<text class="g-t big c" x="925" y="112" text-anchor="middle" style="--c:${C.req}" data-on="4" data-count="4:2-1">2</text>`;
    } else {
      const xs = [64, 190, 316];
      o += G.chip(xs[0], 40, "요청", { w: 104, c: C.req, on: "1", now: "1", cls: "g-dim" });
      o += G.chip(xs[1], 40, "처리", { w: 104, c: C.proc, on: "2", now: "2", cls: "g-dim" });
      o += G.chip(xs[2], 40, "완료", { w: 104, c: C.done, on: "3", now: "3 4", cls: "g-dim" });
      o += G.edge(`M${xs[0] + 52} 40H${xs[1] - 52}`, { id: "rf-m-e1", c: C.proc, draw: "2:0-0.4" });
      o += G.packet("rf-m-e1", "2:0.1-0.75", { r: 4, c: C.proc, stay: true });
      o += `<text class="g-t c" x="${(xs[0] + xs[1]) / 2}" y="80" text-anchor="middle" style="--c:${C.proc}" data-on="2" data-type="2:0.1-0.5">34,000원</text>`;
      o += G.edge(`M${xs[1] + 52} 40H${xs[2] - 52}`, { c: C.done, draw: "3:0-0.25" });
      ["배지", "기록", "알림"].forEach((label, i) => {
        o += G.edge(`M${xs[2]} 56C${xs[2]} 90,${xs[i]} 92,${xs[i]} 118`, { id: `rf-m-s${i}`, c: C.done, draw: `3:${0.2 + i * 0.1}-${0.5 + i * 0.1}` });
        o += `<g data-on="3" class="g-dim">${G.chip(xs[i], 136, label, { w: 104, h: 34, c: C.done, cls: "on" })}</g>`;
      });
      o += `<text class="g-t" x="190" y="196" text-anchor="middle" data-on="0-0" data-type="0:0.12-0.7">A-1031</text>`;
      o += `<text class="g-t c" x="190" y="196" text-anchor="middle" style="--c:${C.req}" data-on="4">요청 탭 2 → 1</text>`;
    }
    return `${o}</svg>`;
  }

  function build() {
    A = AppChapter("ch-refund", STEPS, CAM, "ORDER STATE", "");
    g = Graph(A.mech.body, { svg: graphic(false), mobile: graphic(true) });
  }
  function update(p) {
    const s = A.C.step(p);
    const q = Engine.reduce ? SETTLE[s] : p;
    A.app.update(q);
    g.update(s, A.C.local(p));
    A.mech.cap(CAPS[s]);
  }
  return { build, update, resize() { A.resize(); g.resize(); } };
})();
