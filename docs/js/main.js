/* Atharva Central — no dependencies. The page reads fine without this file;
 * it adds the split-flap motion, the Kanpur station clock and the network map.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var darkQ = matchMedia("(prefers-color-scheme: dark)");
  function isDark() { var t = root.getAttribute("data-theme"); return t ? t === "dark" : darkQ.matches; }

  /* ---------- theme + copy ---------- */
  var tb = document.getElementById("theme-btn");
  function label() { tb.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme"); }
  tb.addEventListener("click", function () {
    var n = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("ad-theme", n); } catch (e) { /* storage unavailable */ }
    label();
  });
  if (darkQ.addEventListener) darkQ.addEventListener("change", label);
  label();

  var toast = document.getElementById("toast"), tt;
  function say(m) { toast.textContent = m; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("on"); }, 2200); }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    say(ok ? "EMAIL COPIED" : "COPY FAILED · " + text);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy]"); if (!b) return;
    var text = b.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say("EMAIL COPIED"); }, function () { fallbackCopy(text); });
    else fallbackCopy(text);
  });

  /* ---------- split-flap ---------- */
  var CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:·-+&/.";
  function mk(cls, ch) { var e = document.createElement("span"); e.className = cls; var b = document.createElement("b"); b.textContent = ch; e.appendChild(b); return e; }
  function build(host) {
    var text = host.getAttribute("data-text"), amber = host.hasAttribute("data-amber");
    host.textContent = "";
    var cells = [];
    for (var i = 0; i < text.length; i++) {
      var c = document.createElement("span");
      c.className = "flap" + (amber ? " amber" : "");
      var top = mk("f-top", text[i]), bot = mk("f-bot", text[i]);
      c.appendChild(top); c.appendChild(bot);
      c._top = top.firstChild; c._bot = bot.firstChild; c._ch = text[i]; c._target = text[i]; c._busy = false;
      host.appendChild(c); cells.push(c);
    }
    return cells;
  }
  function set(c, ch) { c._top.textContent = ch; c._bot.textContent = ch; c._ch = ch; }
  function flipOnce(c, next, dur) {
    var prev = c._ch;
    var lt = mk("leaf t", prev), lb = mk("leaf b", next);
    c.appendChild(lt); c.appendChild(lb);
    c._top.textContent = next;
    return lt.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], { duration: dur, easing: "ease-in", fill: "forwards" }).finished
      .then(function () {
        lt.remove();
        return lb.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }], { duration: dur, easing: "ease-out", fill: "forwards" }).finished;
      })
      .then(function () { c._bot.textContent = next; c._ch = next; lb.remove(); });
  }
  function spin(cells, baseDelay) {
    cells.forEach(function (c, i) {
      var target = c._target, idx = CHARS.indexOf(target);
      if (idx < 0 || target === " " || c._busy) return;
      c._busy = true;
      var steps = 3 + ((i * 7 + target.charCodeAt(0)) % 6);
      var seq = [];
      for (var k = steps; k >= 1; k--) seq.push(CHARS[(idx - k + CHARS.length) % CHARS.length]);
      set(c, seq[0]);
      var p = new Promise(function (r) { setTimeout(r, baseDelay + i * 22); });
      seq.slice(1).concat([target]).forEach(function (ch) { p = p.then(function () { return flipOnce(c, ch, 38); }); });
      p.catch(function () { set(c, target); }).then(function () { c._busy = false; });
    });
  }
  var canAnimate = !reduce && typeof Element.prototype.animate === "function";

  var heroSets = [];
  document.querySelectorAll(".hero .flaps").forEach(function (h) { heroSets.push(build(h)); });
  if (canAnimate) heroSets.forEach(function (cells, r) { spin(cells, 150 + r * 260); });

  var depSets = [];
  document.querySelectorAll(".dep .flaps").forEach(function (h) { depSets.push(build(h)); });
  if (canAnimate && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      depSets.forEach(function (cells, r) { spin(cells, r * 120); });
    }, { threshold: 0.3 });
    io.observe(document.querySelector(".dep"));
  }
  // a departure row re-flips its destination as you leave for its card
  document.querySelectorAll(".dep__row").forEach(function (row) {
    row.addEventListener("click", function () {
      if (!canAnimate) return;
      spin(Array.prototype.slice.call(row.querySelectorAll(".flap")), 0);
    });
  });

  /* ---------- station clock on Kanpur time ---------- */
  var NS = "http://www.w3.org/2000/svg";
  var ticks = document.getElementById("ticks");
  for (var i = 0; i < 60; i++) {
    var r = document.createElementNS(NS, "rect"), big = i % 5 === 0;
    r.setAttribute("class", "tick");
    r.setAttribute("x", big ? 97 : 98.8); r.setAttribute("y", 12);
    r.setAttribute("width", big ? 6 : 2.4); r.setAttribute("height", big ? 20 : 7);
    r.setAttribute("transform", "rotate(" + i * 6 + " 100 100)");
    ticks.appendChild(r);
  }
  var hH = document.getElementById("hand-h"), hM = document.getElementById("hand-m"), hS = document.getElementById("hand-s");
  var topTime = document.getElementById("top-time"), sub = document.getElementById("clock-sub");
  var fmt;
  try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); } catch (e) { fmt = null; }
  function kanpurNow() {
    var d = new Date();
    if (!fmt) { var u = new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000); return { h: u.getHours(), m: u.getMinutes(), s: u.getSeconds(), ms: d.getMilliseconds() }; }
    var parts = {}; fmt.formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    return { h: +parts.hour % 24, m: +parts.minute, s: +parts.second, ms: d.getMilliseconds() };
  }
  var diff = 330 + new Date().getTimezoneOffset(); // minutes Kanpur is ahead of the visitor
  function rel() {
    if (diff === 0) return "same time zone as you";
    var a = Math.abs(diff), h = Math.floor(a / 60), m = a % 60;
    return (h ? h + " h " : "") + (m ? m + " min " : "") + (diff > 0 ? "ahead of you" : "behind you");
  }
  var lastMin = -1;
  function tick() {
    var t = kanpurNow();
    var sec = t.s + t.ms / 1000;
    // like a Swiss station clock: the second hand sweeps round in 58.5 s, then waits for the minute
    var sAngle = reduce ? t.s * 6 : Math.min(360, sec / 58.5 * 360);
    hS.setAttribute("transform", "rotate(" + sAngle + " 100 100)");
    if (t.m !== lastMin) {
      lastMin = t.m;
      hM.setAttribute("transform", "rotate(" + t.m * 6 + " 100 100)");
      hH.setAttribute("transform", "rotate(" + ((t.h % 12) * 30 + t.m * 0.5) + " 100 100)");
      var hh = String(t.h).padStart(2, "0"), mm = String(t.m).padStart(2, "0");
      topTime.textContent = hh + ":" + mm;
      sub.textContent = hh + ":" + mm + " now · UTC+5:30 · " + rel();
    }
  }
  tick();
  var clockEl = document.getElementById("clock"), clockVisible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { clockVisible = en[0].isIntersecting; }).observe(clockEl);
  if (reduce) setInterval(tick, 1000);
  else {
    setInterval(function () { if (!clockVisible) tick(); }, 1000); // keeps the top-bar time current
    (function loop() { if (clockVisible) tick(); requestAnimationFrame(loop); })();
  }

  /* ---------- network map ---------- */
  (function map() {
    var host = document.getElementById("map");
    if (!host) return;
    var LINES = [
      { id: "B", name: "Backend line", c: "var(--l-b)", stations: ["Gin", "FastAPI", "REST", "gRPC", "WebSockets", "SSE"] },
      { id: "M", name: "ML line", c: "var(--l-m)", stations: ["PyTorch", "TensorFlow", "scikit-learn", "Transformers", "LoRA", "vLLM"] },
      { id: "L", name: "LLM apps line", c: "var(--l-l)", stations: ["RAG", "LangGraph", "LangChain", "LlamaIndex", "ChromaDB", "FAISS"] },
      { id: "D", name: "Data line", c: "var(--l-d)", stations: ["PostgreSQL", "pgvector", "Redis", "SQLite", "MongoDB", "Neo4j"] },
      { id: "O", name: "Ops line", c: "var(--l-o)", stations: ["Docker", "AWS", "GCP", "CI/CD", "W&B", "Prometheus"] }
    ];
    var PROJ = [
      { name: "From_Scratch", on: ["M"] },
      { name: "JobBot", on: ["L", "D"] },
      { name: "ArchiGen AI", on: ["B", "L", "O"] },
      { name: "KnowYourRepo", on: ["B", "L", "D", "O"] },
      { name: "SmartFile", on: ["B", "M", "D", "O"] },
      { name: "Semantic-Duel", on: ["B", "M", "O"] }
    ];
    var W = 1040, x0 = 190, x1 = 1010, yTop = 96, gapY = 78;
    var yOf = {}; LINES.forEach(function (l, i) { yOf[l.id] = yTop + i * gapY; });
    var H = yTop + (LINES.length - 1) * gapY + 60;
    var colW = (x1 - x0) / PROJ.length;
    function esc(t) { return t.replace(/&/g, "&amp;"); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    LINES.forEach(function (l) {
      var y = yOf[l.id], d = "M" + x0 + " " + y + " L" + (x1 - 20) + " " + y;
      s += '<path class="casing" d="' + d + '"/><path class="line" d="' + d + '" style="stroke:' + l.c + '"/>';
      s += '<circle cx="' + (x0 - 34) + '" cy="' + y + '" r="15" style="fill:' + l.c + '"/><text class="badge-t" x="' + (x0 - 34) + '" y="' + (y + 5) + '" text-anchor="middle">' + l.id + '</text>';
      s += '<text class="lab" x="' + (x0 - 58) + '" y="' + (y + 5) + '" text-anchor="end">' + l.name + '</text>';
      l.stations.forEach(function (st, k) {
        var x = x0 + colW * k + 8;
        s += '<line class="tick" x1="' + x + '" x2="' + x + '" y1="' + y + '" y2="' + (y + 9) + '" style="stroke:' + l.c + '"/>';
        s += '<text class="lab-s" x="' + (x + 3) + '" y="' + (y + 21) + '">' + esc(st) + '</text>';
      });
    });
    PROJ.forEach(function (p, i) {
      var x = x0 + colW * (i + 0.78);
      var ys = p.on.map(function (id) { return yOf[id]; });
      var top = Math.min.apply(null, ys), bot = Math.max.apply(null, ys);
      s += '<rect x="' + (x - 11) + '" y="' + (top - 11) + '" width="22" height="' + (bot - top + 22) + '" rx="11" style="fill:var(--paper);stroke:var(--ink);stroke-width:3"/>';
      LINES.forEach(function (l) {
        var y = yOf[l.id];
        if (y < top || y > bot) return;
        if (p.on.indexOf(l.id) >= 0) s += '<circle cx="' + x + '" cy="' + y + '" r="5" style="fill:' + l.c + '"/>';
        else s += '<rect x="' + (x - 9) + '" y="' + (y - 5) + '" width="18" height="10" style="fill:var(--paper)"/><line x1="' + (x - 11) + '" x2="' + (x + 11) + '" y1="' + y + '" y2="' + y + '" style="stroke:' + l.c + ';stroke-width:7"/>';
      });
      s += '<text class="proj" x="' + x + '" y="' + (top - 22) + '" text-anchor="middle">' + p.name + '</text>';
    });
    s += "</svg>";
    host.innerHTML = s;
  })();
})();
