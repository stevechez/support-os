/* SupportOS embeddable chat widget loader.
 * Usage: <script src="https://your-app.example/widget.js" data-token="TOKEN" async></script>
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var token = script.getAttribute("data-token");
  if (!token) {
    console.warn("[SupportOS] widget.js: missing data-token attribute");
    return;
  }
  var origin = new URL(script.src).origin;

  var open = false;

  var button = document.createElement("button");
  button.setAttribute("aria-label", "Open support chat");
  button.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;" +
    "background:#18181b;color:#fafafa;border:1px solid rgba(255,255,255,.12);cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:2147483000;display:flex;align-items:center;" +
    "justify-content:center;transition:transform .15s ease";
  button.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  button.onmouseenter = function () {
    button.style.transform = "scale(1.06)";
  };
  button.onmouseleave = function () {
    button.style.transform = "scale(1)";
  };

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget?token=" + encodeURIComponent(token);
  frame.title = "Support chat";
  frame.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:380px;height:560px;max-height:calc(100vh - 110px);" +
    "max-width:calc(100vw - 40px);border:1px solid rgba(255,255,255,.12);border-radius:16px;" +
    "box-shadow:0 12px 40px rgba(0,0,0,.45);z-index:2147483000;background:#18181b;display:none";

  button.addEventListener("click", function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    button.innerHTML = open
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  });

  document.body.appendChild(button);
  document.body.appendChild(frame);
})();
