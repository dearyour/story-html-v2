/* Content. Every sentence a chapter quotes lives here, verbatim from its source (README, development
   notes, spec, changelog, résumé). Chapters cite with note(key, i) in a step's `cite`; they never rewrite
   a line or add numbers. Counts on the page are what the captured screens show — nothing estimated.
   The starter's lines describe the fictional demo app (demo-app/) — replace them with the real sources. */

const NOTES = {
  intro: [
    "Pier는 결제부터 환불까지 주문 하나를 한 목록에서 처리하는 콘솔이다(가상 데모 상점).",
    "목록 행 하나가 주문 하나다. 상태 배지가 그 주문이 지금 어디에 있는지 말한다.",
  ],
  refund: [
    "환불 요청 건은 목록 검색에 주문번호를 치면 그 한 줄만 남고, 누르면 오른쪽 상세에 요청 사유가 보인다.",
    "환불 창은 금액·사유·재고 되돌리기를 한 화면에 모으고, 확인 버튼에 환불 금액을 그대로 적는다.",
    "환불이 끝나면 목록 배지·처리 기록·고객 알림이 모두 같은 상태(환불 완료)를 가리킨다.",
  ],
  end: ["촬영 대상은 demo-app/index.html, 화면은 node capture.mjs로 다시 찍는다."],
};
const note = (key, i = 0) => NOTES[key]?.[i] ?? "";

/* The one object this page follows from the first screen to the last. */
const HERO = { id: "A-1031", who: "윤서아", item: "핸드드립 원두 500g × 2", amount: "34,000원" };

/* Row texts exactly as the captured list shows them (status · amount), used by the opening. */
const ROWS = [
  ["A-1033", "결제 완료", "18,000원", "paid"],
  ["A-1032", "결제 완료", "22,000원", "paid"],
  ["A-1031", "환불 요청", "34,000원", "req"],
  ["A-1030", "배송 중", "31,000원", "ship"],
  ["A-1029", "결제 완료", "12,500원", "paid"],
  ["A-1028", "배송 중", "46,000원", "ship"],
  ["A-1027", "환불 완료", "36,000원", "done"],
  ["A-1026", "결제 완료", "11,000원", "paid"],
  ["A-1025", "배송 중", "15,000원", "ship"],
  ["A-1024", "환불 요청", "17,000원", "req"],
  ["A-1023", "결제 완료", "39,000원", "paid"],
  ["A-1022", "환불 완료", "22,000원", "done"],
];
const STATUS_C = { paid: "var(--blue)", ship: "var(--ink3)", req: "var(--amber)", done: "var(--mint)" };
