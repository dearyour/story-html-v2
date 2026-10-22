/* 00 INTRO — the opening interprets the content. Twelve order lines (the list's own rows: id · status ·
   amount) drift loose on the stage; scrolling lands each on its exact row of the captured list — the
   targets are the rows' measured boxes projected through the camera — while the window frame assembles
   around them; then the real capture surfaces under the lines and they dissolve into it. Identity is
   kept: the same twelve rows, first as fragments, then as pixels. Finally the camera pushes into the one
   order the page follows (HERO) and a loupe reads its status badge.
   This is the starter's example of a signature opening — a new page must invent its own. */

const ChHero = (() => {
  let A;
  let layer;
  let frags = [];
  let offY = 0; // the window's top inside the canvas (measured in resize, never per frame)
  const STEPS = [
    { at: 0, label: "흩어진 줄", title: "결제 · 배송 · 환불이<br><em>한 목록</em>에 있습니다.", body: "상태도 금액도 다른 주문 열두 건이 떠 있습니다.", cite: note("intro", 0) },
    { at: 0.3, label: "제자리로", title: "줄마다<br><em>제자리</em>가 있습니다.", body: "각 줄이 실제 목록 화면의 자기 행으로 내려앉습니다.", cite: note("intro", 1) },
    { at: 0.56, label: "실제 화면", title: "그 자리가<br><em>실제 화면</em>입니다.", body: "가상 상점 Pier의 주문 목록 캡처가 줄 아래에서 드러납니다." },
    { at: 0.8, label: HERO.id, title: `주인공은<br><em>${HERO.id}</em>입니다.`, body: `${HERO.who} 고객의 환불 요청, ${HERO.amount}. 이 페이지는 이 주문 하나를 따라갑니다.` },
  ];
  const SETTLE = [0.2, 0.5, 0.74, 0.97];
  const CAM = {
    keys: [
      { at: 0, shot: "list", x: 0, y: 0, w: 1440, mw: 760, mx: 640, my: 470 },
      { at: 0.82, shot: "list", box: "hero", w: 1100, mw: 560, mx: 560 },
    ],
    marks: [
      { from: 0.84, to: 1.01, shot: "list", box: "hero", c: "var(--amber)" },
      { from: 0.86, to: 1.01, shot: "list", box: "heroBadge", pad: 8, label: `${HERO.id} · 환불 요청`, below: true, c: "var(--amber)", lens: 2.4, lensSize: 200 },
    ],
  };

  function build() {
    A = AppChapter("ch-hero", STEPS, CAM, false, "", { ctx: "signal", stamp: `${CAPTURE.captured} 화면 · 가상 데모 상점` });
    layer = el(`<div class="hx-frags" aria-hidden="true"></div>`);
    A.fit.inner.appendChild(layer);
    const r = rng(7);
    frags = ROWS.map(([id, status, amount, st], i) => {
      const n = el(`<div class="hx-f${id === HERO.id ? " is-hero" : ""}" style="--c:${STATUS_C[st]}"><b>${id}</b><span>${status}</span><em>${amount}</em></div>`);
      layer.appendChild(n);
      // Loose positions: two drifting columns over the stage, slightly tilted, at different depths.
      const col = i % 3;
      return {
        n,
        id,
        sx: 40 + col * 300 + r() * 90,
        sy: 60 + Math.floor(i / 3) * 190 + r() * 70,
        rot: (r() - 0.5) * 10,
        depth: 0.4 + r() * 0.9,
        delay: i * 0.012,
      };
    });
  }

  function resize() {
    A.resize();
    offY = A.app.node.parentElement.offsetTop;
  }

  function update(p) {
    const s = A.C.step(p);
    const q = Engine.reduce ? SETTLE[s] : p;
    A.app.update(q);
    const m = Engine.mobile;
    // The window assembles while the lines land; the capture surfaces under them; the lines dissolve.
    setVar(A.app.node, "--win", Engine.reduce ? 1 : E.reveal(seg(q, 0.24, 0.42)).toFixed(3));
    setVar(A.app.node, "--shot", Engine.reduce ? 1 : E.reveal(seg(q, 0.54, 0.7)).toFixed(3));
    const gone = Engine.reduce ? 1 : seg(q, 0.62, 0.76);
    const vw = m ? APPM.w : APPD.w;
    for (const f of frags) {
      const b = box("list", `row-${f.id}`);
      const t0 = A.app.project(b.x, b.y);
      const t1 = A.app.project(b.x + b.w, b.y + b.h);
      const tx = clamp(t0.x, 4, vw - 40);
      const tw = Math.max(40, Math.min(t1.x, vw - 4) - tx);
      const th = t1.y - t0.y;
      const k = Engine.reduce ? 1 : E.travel(seg(q, 0.3 + f.delay, 0.52 + f.delay));
      const drift = (1 - k) * q * 120 * f.depth;
      const sx = m ? 14 + (f.sx / 1000) * 250 : f.sx;
      const sy = (m ? 40 + (f.sy / 850) * 420 : f.sy) - drift;
      const x = lerp(sx, tx, k);
      const y = lerp(sy, offY + t0.y, k);
      const w = lerp(m ? 200 : 250, tw, k);
      const h = lerp(m ? 40 : 46, th, k);
      const appear = Engine.reduce ? 1 : seg(q, f.delay, 0.08 + f.delay);
      // Reduced motion shows each step settled: the capture alone, no fragments.
      const hide = Engine.reduce ? 1 : f.id === HERO.id ? seg(q, 0.7, 0.8) : gone;
      f.n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${lerp(f.rot, 0, k).toFixed(2)}deg)`;
      f.n.style.width = `${w.toFixed(1)}px`;
      f.n.style.height = `${h.toFixed(1)}px`;
      f.n.style.opacity = (appear * (1 - hide)).toFixed(3);
      setVar(f.n, "--land", k.toFixed(3));
    }
  }

  return { build, resize, update };
})();
