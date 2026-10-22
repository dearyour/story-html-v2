// What capture.mjs shoots. Replace the demo app with the real product (a local dev server, a staging URL
// with config.context.storageState for the login) or with a reconstruction page you wrote (demo-app/ is
// one). Keys are what chapters reference: SHOTS["detail"], box("detail", "refund"), seq("search", a, b).
const demo = new URL("./demo-app/index.html", import.meta.url).href;

export default {
  base: demo, // relative shot urls resolve against this; for a server use e.g. "http://127.0.0.1:5173"
  host: "pier.example", // shown in the window's address bar instead of localhost or a file path
  viewport: { width: 1440, height: 900 },
  scale: 2, // device pixel ratio of the saved WebP (css size stays 1440×900); 1.5 halves the size
  quality: 0.82,
  // Public page? Rewrite every identifying string in the live DOM before each screenshot, and list
  // patterns that must never reach a saved image (the shot fails if one is still visible). Put the real
  // names in redact.local.mjs (git-ignored) — the dictionary itself names what it hides:
  //   export default { replace: { "Real Company": "가상 상점" }, forbid: [/realcompany/i, "internal.example.net"] };
  // Images inside the app (avatars, logos, charts with names) are not text: hide or blur them.
  replace: {},
  forbid: [],
  hide: [],
  blur: [],
  // Named boxes measured on every shot where they exist (css px). "row-*" names each match by data-id.
  boxes: {
    search: "#q",
    tabs: "#tabs",
    "row-*": "#rows tr[data-id]",
    nav: ".side",
    stats: ".stats",
  },
  shots: [
    { key: "list", url: "#tab=all", boxes: { hero: "tr[data-id='A-1031']", heroBadge: "tr[data-id='A-1031'] .badge" } },
    { key: "search", url: "#tab=all", type: { selector: "#q", text: "A-1031", every: 1 } },
    { key: "found", url: "#tab=all&q=A-1031", boxes: { hero: "tr[data-id='A-1031']" } },
    {
      key: "detail",
      url: "#tab=all&sel=A-1031",
      boxes: { drawer: ".drawer", badge: "#drBadge", amount: ".d-amount", timeline: ".timeline", request: ".timeline li.warn", refund: "#refundBtn" },
    },
    {
      key: "refund",
      url: "#tab=all&sel=A-1031&modal=refund",
      boxes: { modal: ".modal", amountField: "#refundAmt", confirm: "#confirmBtn" },
    },
    {
      key: "done",
      url: "#tab=all&sel=A-1031&status=refunded",
      boxes: { drawer: ".drawer", badge: "#drBadge", toast: ".toast", timeline: ".timeline", done: ".timeline li.ok", refund: "#refundBtn", rowBadge: "tr[data-id='A-1031'] .badge" },
    },
    { key: "requests", url: "#tab=req&status=refunded", boxes: { reqTab: ".tab.warn", left: "tr[data-id='A-1024']" } },
  ],
};
