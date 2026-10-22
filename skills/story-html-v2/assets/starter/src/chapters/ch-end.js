/* END — the way out, and every screen the page used as a contact sheet: each thumbnail is the real
   capture and jumps back to the step that shows it. Replace the CTA with the product's real next step
   (install command, link, repository) and the sheet with the page's own shots. */

const ChEnd = (() => {
  let C;
  let cells = [];
  // [shot, caption, chapter, p] — p lands on the step that shows the shot.
  const SHEET = [
    ["list", "주문 목록 · 열네 건", "ch-hero", 0.74],
    ["found", "검색 · 한 줄", "ch-refund", 0.19],
    ["detail", "상세 · 요청 사유", "ch-refund", 0.36],
    ["refund", "환불 창 · 금액 버튼", "ch-refund", 0.52],
    ["done", "완료 · 세 곳 같은 상태", "ch-refund", 0.74],
    ["requests", "환불 요청 탭 · 1건", "ch-refund", 0.92],
  ];

  function build() {
    C = Chapter("ch-end", {
      layout: "split",
      ctx: "signal",
      steps: [
        {
          at: 0,
          label: "정리",
          title: "여섯 화면으로<br><em>환불 한 건</em>을 끝냈습니다.",
          body: "모든 화면은 실제로 띄운 앱의 캡처입니다. 누르면 그 장면으로 돌아갑니다.",
          cite: note("end", 0),
        },
      ],
    });
    C.product.innerHTML = `
      <div class="end">
        <section class="end-cta">
          <div class="end-cta-h"><i></i><div><b>Pier 데모 다시 찍기</b><span>가상 상점 · ${esc(CAPTURE.captured)} 캡처</span></div></div>
          <ol class="end-cmd">
            <li><code>node capture.mjs</code><span>화면 ${SHEET.length}장 + 입력 녹화</span></li>
            <li><code>node build.mjs</code><span>dist/index.html 한 파일</span></li>
          </ol>
        </section>
        <p class="end-h"><b>${SHEET.length}</b> 화면 · 누르면 그 장으로</p>
        <div class="end-sheet">${SHEET.map(
          ([shot, label], i) => `<button type="button" class="end-cell" data-i="${i}" style="--i:${i}">
              <span class="end-img">${SHOTS[shot] ? `<img alt="" loading="lazy" src="${SHOTS[shot].src}">` : ""}</span>
              <span class="end-cap">${esc(label)}</span>
            </button>`,
        ).join("")}</div>
      </div>`;
    cells = $$(".end-cell", C.product);
    C.product.addEventListener("click", (event) => {
      const cell = event.target.closest(".end-cell");
      if (!cell) return;
      const [, , id, p] = SHEET[Number(cell.dataset.i)];
      Engine.scrollToScene(id, p);
    });
  }

  function update(p, scene) {
    C.step(p);
    const k = Engine.reduce ? 1 : clamp((scene.enter - 0.25) / 0.6);
    cells.forEach((cell, i) => toggle(cell, "is-on", k > i / (cells.length + 1)));
  }

  return { build, update };
})();
