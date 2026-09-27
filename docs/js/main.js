/* Atharva Dwivedi — identity document
 * No dependencies. Everything here enhances a page that already reads fine without it.
 *   1. theme toggle
 *   2. copy email + toast
 *   3. guilloche security print (card + hero), drawn on canvas
 *   4. ID card: pointer tilt, holographic foil, flip
 *   5. 3D project graph with a keyboard-friendly side panel
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* ------------------------------------------------------------------ */
  /* 1. Theme                                                            */
  /* ------------------------------------------------------------------ */

  var themeListeners = [];
  function onTheme(fn) { themeListeners.push(fn); }
  function themeChanged() { themeListeners.forEach(function (fn) { fn(); }); }

  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : darkQuery.matches;
  }

  var themeBtn = document.getElementById("theme-toggle");
  function syncThemeLabel() {
    if (themeBtn) themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ad-theme", next); } catch (e) { /* storage unavailable */ }
    });
  }
  onMediaChange(darkQuery, function () { syncThemeLabel(); themeChanged(); });
  new MutationObserver(function () { syncThemeLabel(); themeChanged(); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  syncThemeLabel();

  /* ------------------------------------------------------------------ */
  /* 2. Copy + toast                                                     */
  /* ------------------------------------------------------------------ */

  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? "Email copied" : "Couldn't copy. The address is " + text);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-copy]");
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast("Email copied"); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  });

  /* ------------------------------------------------------------------ */
  /* 3. Guilloche                                                        */
  /* Rosettes are polar curves r = R + a·sin(nθ) + b·sin(mθ), drawn as   */
  /* rotated copies so the lobes interleave, the way banknote and ID     */
  /* printers build theirs. Waves are phase-shifted sine bundles.        */
  /* ------------------------------------------------------------------ */

  function rosette(ctx, o) {
    var steps = o.steps || 900;
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw;
    for (var k = 0; k < o.copies; k++) {
      var rot = (k * 2 * Math.PI) / (o.copies * o.lobes);
      ctx.beginPath();
      for (var i = 0; i <= steps; i++) {
        var t = (i / steps) * 2 * Math.PI;
        var r = o.R + o.a * Math.sin(o.lobes * t) + (o.b || 0) * Math.sin((o.m || 0) * t + k * 0.35);
        var x = o.cx + r * Math.cos(t + rot);
        var y = o.cy + r * Math.sin(t + rot);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  function waves(ctx, o) {
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw;
    for (var k = 0; k < o.lines; k++) {
      var ph = (k / o.lines) * 2 * Math.PI;
      ctx.beginPath();
      for (var x = o.x0; x <= o.x1; x += 3) {
        var y = o.cy +
          o.amp * Math.sin((2 * Math.PI * x) / o.wl + ph) +
          o.drift * Math.sin((2 * Math.PI * x) / (o.wl * 3.7) + ph * 0.5);
        if (x === o.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  /* card print: fixed inks, because the card is a physical object */
  var card = document.getElementById("id-card");
  (function paintCard() {
    if (!card) return;
    var W = 1200, H = Math.round(1200 / 1.5858);
    try {
      var front = makeCanvas(W, H), f = front.getContext("2d");
      waves(f, { x0: 0, x1: W, cy: H * 0.66, amp: H * 0.09, drift: H * 0.05, wl: W * 0.36, lines: 26, stroke: "rgba(38,112,104,0.20)", lw: 1 });
      waves(f, { x0: 0, x1: W, cy: H * 0.2, amp: H * 0.035, drift: H * 0.02, wl: W * 0.22, lines: 14, stroke: "rgba(38,112,104,0.12)", lw: 0.9 });
      rosette(f, { cx: W * 0.8, cy: H * 0.56, R: W * 0.17, a: W * 0.04, b: W * 0.012, m: 5, lobes: 14, copies: 11, stroke: "rgba(164,72,98,0.17)", lw: 1 });
      rosette(f, { cx: W * 0.8, cy: H * 0.56, R: W * 0.085, a: W * 0.028, lobes: 9, copies: 9, stroke: "rgba(38,112,104,0.22)", lw: 0.9 });

      var back = makeCanvas(W, H), b = back.getContext("2d");
      waves(b, { x0: 0, x1: W, cy: H * 0.7, amp: H * 0.12, drift: H * 0.05, wl: W * 0.42, lines: 30, stroke: "rgba(38,112,104,0.13)", lw: 1 });
      rosette(b, { cx: W * 0.16, cy: H * 0.72, R: W * 0.14, a: W * 0.035, lobes: 12, copies: 10, stroke: "rgba(164,72,98,0.10)", lw: 1 });

      var foil = makeCanvas(W, H), m = foil.getContext("2d");
      rosette(m, { cx: W * 0.8, cy: H * 0.56, R: W * 0.17, a: W * 0.04, b: W * 0.012, m: 5, lobes: 14, copies: 11, stroke: "#000", lw: 3.2 });
      rosette(m, { cx: W * 0.8, cy: H * 0.56, R: W * 0.085, a: W * 0.028, lobes: 9, copies: 9, stroke: "#000", lw: 2.6 });
      waves(m, { x0: 0, x1: W, cy: H * 0.2, amp: H * 0.035, drift: H * 0.02, wl: W * 0.22, lines: 14, stroke: "#000", lw: 2.2 });

      card.style.setProperty("--card-guilloche", "url(" + front.toDataURL("image/png") + ")");
      card.style.setProperty("--card-guilloche-back", "url(" + back.toDataURL("image/png") + ")");
      card.style.setProperty("--foil-mask", "url(" + foil.toDataURL("image/png") + ")");
      card.classList.add("has-guilloche");
    } catch (e) { /* canvas unavailable: CSS fallback pattern stays */ }
  })();

  /* hero print: follows the theme's ink */
  var hero = document.querySelector(".hero");
  var heroCanvas = document.getElementById("hero-guilloche");
  var stage = document.getElementById("card-stage");
  var fieldsEl = document.querySelector(".fields");

  function paintHero() {
    if (!hero || !heroCanvas || !heroCanvas.getContext) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    heroCanvas.width = Math.round(w * dpr);
    heroCanvas.height = Math.round(h * dpr);
    var ctx = heroCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var ink = cssVar("--line-ink") || "15, 26, 44";
    var acc = cssVar("--line-accent") || "38, 112, 104";
    var dark = isDark();
    var hr = hero.getBoundingClientRect();

    if (stage) {
      var sr = stage.getBoundingClientRect();
      var cx = sr.left - hr.left + sr.width / 2;
      var cy = sr.top - hr.top + sr.width / 1.5858 / 2;
      var R = sr.width * 0.66;
      rosette(ctx, { cx: cx, cy: cy, R: R, a: R * 0.2, b: R * 0.05, m: 7, lobes: 18, copies: 14, stroke: "rgba(" + ink + "," + (dark ? 0.07 : 0.075) + ")", lw: 0.8, steps: 1400 });
      rosette(ctx, { cx: cx, cy: cy, R: R * 0.58, a: R * 0.1, lobes: 11, copies: 10, stroke: "rgba(" + acc + "," + (dark ? 0.12 : 0.13) + ")", lw: 0.8, steps: 1000 });
    }
    if (fieldsEl) {
      var fr = fieldsEl.getBoundingClientRect();
      var fy = fr.top - hr.top + fr.height / 2;
      waves(ctx, { x0: 0, x1: w, cy: fy, amp: fr.height * 0.32, drift: fr.height * 0.12, wl: Math.max(320, w * 0.28), lines: 22, stroke: "rgba(" + acc + "," + (dark ? 0.08 : 0.09) + ")", lw: 0.8 });
    }
  }

  var heroTimer;
  function schedulePaintHero() {
    clearTimeout(heroTimer);
    heroTimer = setTimeout(paintHero, 120);
  }
  window.addEventListener("resize", schedulePaintHero);
  onTheme(paintHero);
  paintHero();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintHero);

  /* ------------------------------------------------------------------ */
  /* 4. The card                                                         */
  /* ------------------------------------------------------------------ */

  (function cardInteraction() {
    var tiltEl = document.getElementById("card-tilt");
    var flipBtn = document.getElementById("flip-btn");
    var hint = document.getElementById("card-hint-text");
    var area = document.querySelector(".hero__card");
    if (!card || !tiltEl || !area) return;

    var coarse = window.matchMedia("(hover: none)").matches;
    function setHint() {
      if (!hint) return;
      if (reduceMotion.matches) hint.textContent = "Use Flip card to see the back";
      else hint.textContent = coarse ? "Drag the card to tilt it, tap to flip" : "Move your pointer over the card to tilt it";
    }
    setHint();

    var flipped = false;
    function flip() {
      flipped = !flipped;
      card.classList.toggle("is-flipped", flipped);
      if (flipBtn) {
        flipBtn.setAttribute("aria-pressed", String(flipped));
        flipBtn.textContent = flipped ? "Show front" : "Flip card";
      }
    }
    if (flipBtn) flipBtn.addEventListener("click", flip);

    // resting pose: angled toward the name so the card reads as an object
    var REST = { rx: 5, ry: -11 };
    var target = { rx: REST.rx, ry: REST.ry, px: 0.3, py: 0.25, holo: 0.16, glare: 0.5 };
    var cur = { rx: REST.rx, ry: REST.ry, px: 0.3, py: 0.25, holo: 0.16, glare: 0.5 };
    var active = false;
    var down = null;
    var moved = 0;

    function aim(clientX, clientY) {
      var r = card.getBoundingClientRect();
      var px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      var py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      target.px = px;
      target.py = py;
      target.ry = (px - 0.5) * 30;
      target.rx = -(py - 0.5) * 22;
      target.holo = 0.62;
      target.glare = 0.95;
      active = true;
    }
    function release() {
      active = false;
      target.holo = 0.16;
      target.glare = 0.5;
    }

    area.addEventListener("pointermove", function (e) {
      if (reduceMotion.matches) return;
      if (e.pointerType === "mouse" || down) {
        aim(e.clientX, e.clientY);
        if (down) moved = Math.max(moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
      }
    });
    area.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") release(); });
    card.addEventListener("pointerdown", function (e) {
      down = { x: e.clientX, y: e.clientY };
      moved = 0;
      if (!reduceMotion.matches) aim(e.clientX, e.clientY);
    });
    window.addEventListener("pointerup", function (e) {
      if (!down) return;
      down = null;
      if (e.pointerType !== "mouse") release();
    });
    window.addEventListener("pointercancel", function () { down = null; release(); });
    card.addEventListener("click", function () {
      if (moved > 8) return; // that was a tilt, not a tap
      flip();
    });

    function apply() {
      tiltEl.style.setProperty("--rx", cur.rx.toFixed(2) + "deg");
      tiltEl.style.setProperty("--ry", cur.ry.toFixed(2) + "deg");
      card.style.setProperty("--mx", (cur.px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (cur.py * 100).toFixed(1) + "%");
      card.style.setProperty("--hx", (50 + (cur.px - 0.5) * 90).toFixed(1) + "%");
      card.style.setProperty("--hy", (50 + (cur.py - 0.5) * 90).toFixed(1) + "%");
      card.style.setProperty("--holo-angle", (112 + (cur.px - 0.5) * 40).toFixed(1) + "deg");
      card.style.setProperty("--holo-o", cur.holo.toFixed(3));
      card.style.setProperty("--glare-o", cur.glare.toFixed(3));
    }

    if (reduceMotion.matches) {
      cur.rx = 0; cur.ry = 0;
      apply();
      return;
    }

    var visible = true, raf = 0;
    function frame(t) {
      raf = 0;
      if (!active) {
        // slow idle drift around the resting pose
        target.rx = REST.rx + Math.sin(t / 2600) * 2.2;
        target.ry = REST.ry + Math.cos(t / 3400) * 3.2;
        target.px = 0.3 + Math.sin(t / 3000) * 0.12;
        target.py = 0.25 + Math.cos(t / 3600) * 0.1;
      }
      var k = active ? 0.16 : 0.05;
      cur.rx += (target.rx - cur.rx) * k;
      cur.ry += (target.ry - cur.ry) * k;
      cur.px += (target.px - cur.px) * k;
      cur.py += (target.py - cur.py) * k;
      cur.holo += (target.holo - cur.holo) * 0.1;
      cur.glare += (target.glare - cur.glare) * 0.1;
      apply();
      if (visible) raf = requestAnimationFrame(frame);
    }
    apply();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(area);
    } else {
      raf = requestAnimationFrame(frame);
    }

    onMediaChange(reduceMotion, function () { setHint(); });
  })();

  /* ------------------------------------------------------------------ */
  /* 5. Project graph                                                    */
  /* ------------------------------------------------------------------ */

  var NODES = [
    { id: "kyr", label: "KnowYourRepo", type: "project", href: "#kyr", text: "Call graphs, dependency maps and a code chat with sources for any GitHub repository." },
    { id: "jobbot", label: "JobBot", type: "project", href: "#jobbot", text: "Crawls job boards, scores listings against a real profile and tailors a résumé without inventing skills." },
    { id: "archigen", label: "ArchiGen AI", type: "project", href: "#archigen", text: "Plain language in, a validated architecture diagram and ADR out." },
    { id: "smartfile", label: "SmartFile Manager", type: "project", href: "#smartfile", text: "Local semantic search over your files, with OCR and embeddings." },
    { id: "duel", label: "Semantic-Duel", type: "project", href: "#duel", text: "A real-time word game for two, scored by semantic similarity." },
    { id: "fly", label: "Fly Brain", type: "project", href: "#flybrain", text: "A spiking network wired from a fruit-fly connectome, playing Flappy Bird." },
    { id: "finrag", label: "Financial Agentic RAG", type: "project", href: "#other", text: "Multi-agent financial reasoning with retrieval, market data and news." },
    { id: "findoc", label: "Financial Doc Analyzer", type: "project", href: "#other", text: "CrewAI agents plus deterministic ratio tools over corporate PDFs." },
    { id: "wyrd", label: "Local RAG Wyrd Wiki", type: "project", href: "#other", text: "Offline RAG over a company wiki, with sources and a confidence score." },
    { id: "music", label: "Social Music Graph", type: "project", href: "#other", text: "A Go service over a Neo4j social graph, with GraphSAGE embeddings." },
    { id: "lm", label: "LM Implementations", type: "project", href: "#lab", text: "LLaMA 2, Gemma 3, Qwen 3 and a small LM, rebuilt in PyTorch." },
    { id: "vqvae", label: "VQ-VAE", type: "project", href: "#lab", text: "Vector-quantised autoencoder with a learnable codebook, trained on CIFAR-10." },
    { id: "rl", label: "RL from scratch", type: "project", href: "#lab", text: "DQN, Dueling DQN, A3C and Soft Actor-Critic, implemented by hand." },

    { id: "go", label: "Go", type: "lang", text: "The long-running side: services, worker pools, WebSocket hubs and file watchers." },
    { id: "python", label: "Python", type: "lang", text: "Models, embeddings, agents and the ML services that sit next to the Go ones." },
    { id: "ts", label: "TypeScript", type: "lang", text: "The frontends for the tools, written in React." },

    { id: "fastapi", label: "FastAPI", type: "tech", text: "The Python service layer: extraction, embeddings and agent APIs." },
    { id: "gin", label: "Gin", type: "tech", text: "HTTP framework for the Go APIs." },
    { id: "langgraph", label: "LangGraph", type: "tech", text: "State machines for agent pipelines that need loops and conditional routing." },
    { id: "crewai", label: "CrewAI", type: "tech", text: "Role-based agent crews." },
    { id: "pytorch", label: "PyTorch", type: "tech", text: "Every from-scratch model, plus the GNN and spiking-network work." },
    { id: "pg", label: "Postgres + pgvector", type: "tech", text: "Relational data and vector search in one database." },
    { id: "sqlite", label: "SQLite", type: "tech", text: "Zero-config storage, including a database-backed rate limiter." },
    { id: "neo4j", label: "Neo4j", type: "tech", text: "Graph database for users, tracks and the links between them." },
    { id: "chroma", label: "ChromaDB", type: "tech", text: "Persistent local vector store." },
    { id: "redis", label: "Redis", type: "tech", text: "Queue broker for background jobs." },
    { id: "docker", label: "Docker", type: "tech", text: "The multi-service projects ship with a Dockerfile or a compose file." },
    { id: "prom", label: "Prometheus + Grafana", type: "tech", text: "Metrics and a provisioned dashboard." },
    { id: "ws", label: "WebSockets", type: "tech", text: "Real-time game traffic with ping/pong heartbeats." },
    { id: "treesitter", label: "tree-sitter", type: "tech", text: "Parses Go, Python and JavaScript into symbols and call edges." },
    { id: "ollama", label: "Ollama", type: "tech", text: "Local models with no API keys." },
    { id: "st", label: "sentence-transformers", type: "tech", text: "Small local embedding models such as MiniLM-L6-v2." },
    { id: "react", label: "React", type: "tech", text: "Interfaces for the tools." },
    { id: "graphviz", label: "Graphviz", type: "tech", text: "Deterministic layout, so generated diagrams never overlap." },
    { id: "rag", label: "RAG", type: "tech", text: "Retrieval-augmented generation, the thread through most of the AI work." },
    { id: "router", label: "Multi-LLM failover", type: "tech", text: "Routing across providers, retrying when a response fails validation." },
    { id: "telegram", label: "Telegram bot", type: "tech", text: "JobBot's entire interface." },
    { id: "gnn", label: "GraphSAGE", type: "tech", text: "Graph neural network embeddings." },
    { id: "snn", label: "Spiking neurons", type: "tech", text: "Leaky integrate-and-fire dynamics trained through surrogate gradients." }
  ];

  var LINKS = {
    kyr: ["go", "gin", "python", "fastapi", "pg", "treesitter", "rag", "router", "ollama", "react", "ts", "docker", "prom"],
    jobbot: ["python", "langgraph", "sqlite", "router", "telegram"],
    archigen: ["python", "langgraph", "fastapi", "graphviz", "react", "ts", "docker"],
    smartfile: ["go", "python", "fastapi", "sqlite", "st", "docker"],
    duel: ["go", "ws", "react", "ts", "st"],
    fly: ["python", "pytorch", "snn"],
    finrag: ["python", "fastapi", "rag", "docker"],
    findoc: ["python", "fastapi", "crewai", "redis"],
    wyrd: ["python", "rag", "ollama", "chroma"],
    music: ["go", "gin", "neo4j", "python", "fastapi", "pytorch", "gnn"],
    lm: ["python", "pytorch"],
    vqvae: ["python", "pytorch"],
    rl: ["python", "pytorch"]
  };

  (function graph() {
    var box = document.getElementById("graph");
    var canvas = document.getElementById("graph-canvas");
    if (!box || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var byId = {};
    NODES.forEach(function (n, i) { n.i = i; n.nb = []; byId[n.id] = n; });
    var EDGES = [];
    Object.keys(LINKS).forEach(function (p) {
      LINKS[p].forEach(function (t) {
        EDGES.push([byId[p], byId[t]]);
        byId[p].nb.push(byId[t]);
        byId[t].nb.push(byId[p]);
      });
    });

    /* force layout in 3D, seeded so it is identical on every load */
    (function layout() {
      var seed = 3105;
      function rand() {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      NODES.forEach(function (n) {
        var u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        n.x = r * Math.cos(th); n.y = u; n.z = r * Math.sin(th);
      });
      var N = NODES.length, ITER = 420;
      for (var it = 0; it < ITER; it++) {
        var alpha = 0.08 * (1 - it / ITER) + 0.004;
        var F = NODES.map(function () { return [0, 0, 0]; });
        for (var a = 0; a < N; a++) {
          for (var b = a + 1; b < N; b++) {
            var A = NODES[a], B = NODES[b];
            var dx = A.x - B.x, dy = A.y - B.y, dz = A.z - B.z;
            var d2 = dx * dx + dy * dy + dz * dz + 0.004;
            var f = 0.05 / d2;
            F[a][0] += dx * f; F[a][1] += dy * f; F[a][2] += dz * f;
            F[b][0] -= dx * f; F[b][1] -= dy * f; F[b][2] -= dz * f;
          }
        }
        EDGES.forEach(function (e) {
          var A = e[0], B = e[1];
          var dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z;
          var d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
          var f = (d - 0.5) * 0.9 / d;
          F[A.i][0] += dx * f; F[A.i][1] += dy * f; F[A.i][2] += dz * f;
          F[B.i][0] -= dx * f; F[B.i][1] -= dy * f; F[B.i][2] -= dz * f;
        });
        NODES.forEach(function (n, i) {
          F[i][0] -= n.x * 0.15; F[i][1] -= n.y * 0.15; F[i][2] -= n.z * 0.15;
          n.x += Math.max(-0.2, Math.min(0.2, F[i][0] * alpha));
          n.y += Math.max(-0.2, Math.min(0.2, F[i][1] * alpha));
          n.z += Math.max(-0.2, Math.min(0.2, F[i][2] * alpha));
        });
      }
      var cx = 0, cy = 0, cz = 0;
      NODES.forEach(function (n) { cx += n.x; cy += n.y; cz += n.z; });
      cx /= N; cy /= N; cz /= N;
      // scale by the 85th-percentile radius, then compress outliers so
      // one far leaf can't shrink the rest of the graph
      var radii = NODES.map(function (n) {
        n.x -= cx; n.y -= cy; n.z -= cz;
        return Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      }).sort(function (a, b) { return a - b; });
      var ref = radii[Math.floor(radii.length * 0.85)] || 1;
      NODES.forEach(function (n) {
        var r = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) / ref + 1e-6;
        var s = (1.05 * Math.tanh(r / 1.05)) / r / ref;
        n.x *= s; n.y *= s; n.z *= s;
      });
    })();

    var W = 0, H = 0, dpr = 1;
    var yaw = -0.5, pitch = -0.28, targetYaw = null, targetPitch = null;
    var selected = byId.go, hovered = null;
    var colors = {};

    function readColors() {
      colors.ink = cssVar("--ink");
      colors.ink2 = cssVar("--ink-2");
      colors.ink3 = cssVar("--ink-3");
      colors.paper = cssVar("--paper-2");
      colors.accent = cssVar("--accent");
      colors.accentRgb = cssVar("--graph-accent");
      colors.inkRgb = cssVar("--line-ink");
    }

    function resize() {
      var r = box.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      draw();
    }

    function project() {
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var D = 4.5;
      var sx = Math.min(W * 0.41, H * 0.82), sy = H * 0.4;
      NODES.forEach(function (n) {
        var x = n.x * cyw + n.z * syw;
        var z = -n.x * syw + n.z * cyw;
        var y = n.y * cp - z * sp;
        z = n.y * sp + z * cp;
        var k = D / (D - z);
        n.sx = W / 2 + x * sx * k;
        n.sy = H / 2 + y * sy * k;
        n.k = k;
        n.depth = z;
      });
    }

    function focusSet() {
      var f = hovered || selected;
      if (!f) return null;
      var s = {};
      s[f.id] = 2;
      f.nb.forEach(function (n) { s[n.id] = 1; });
      return s;
    }

    function radius(n) {
      var base = n.type === "project" ? 5.5 : n.type === "lang" ? 8 : 4;
      return base * n.k;
    }

    function draw() {
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      project();
      var fs = focusSet();
      var focus = hovered || selected;

      // edges
      EDGES.forEach(function (e) {
        var A = e[0], B = e[1];
        var lit = focus && (A === focus || B === focus);
        var depthA = 0.35 + 0.65 * ((A.depth + B.depth) / 2 + 1) / 2;
        ctx.beginPath();
        ctx.moveTo(A.sx, A.sy);
        ctx.lineTo(B.sx, B.sy);
        if (lit) {
          ctx.strokeStyle = "rgba(" + colors.accentRgb + "," + (0.55 + 0.4 * depthA).toFixed(3) + ")";
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = "rgba(" + colors.inkRgb + "," + ((fs ? 0.05 : 0.16) * depthA + 0.02).toFixed(3) + ")";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      });

      // nodes, far to near
      var order = NODES.slice().sort(function (a, b) { return a.depth - b.depth; });
      order.forEach(function (n) {
        var depthA = 0.3 + 0.7 * (n.depth + 1) / 2;
        var dim = fs && !fs[n.id];
        var r = radius(n);
        ctx.globalAlpha = dim ? depthA * 0.32 : depthA;

        ctx.beginPath();
        ctx.arc(n.sx, n.sy, r, 0, Math.PI * 2);
        if (n.type === "project") {
          ctx.fillStyle = colors.ink;
          ctx.fill();
        } else if (n.type === "lang") {
          ctx.fillStyle = colors.accent;
          ctx.fill();
        } else {
          ctx.fillStyle = colors.paper;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = colors.ink2;
          ctx.stroke();
        }
        if (focus === n) {
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(n.sx, n.sy, r + 5, 0, Math.PI * 2);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = colors.accent;
          ctx.stroke();
        }
      });

      // labels: most important first, skipped when they would collide
      function prio(n) {
        if (n === focus) return 1000;
        if (fs && fs[n.id]) return 500 + n.depth;
        if (n.type === "lang") return 300 + n.depth;
        if (n.type === "project") return 200 + n.depth;
        return 100 + n.depth;
      }
      var placed = [];
      function clear(b) {
        for (var i = 0; i < placed.length; i++) {
          var p = placed[i];
          if (b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) return false;
        }
        return b.x > 2 && b.x + b.w < W - 2 && b.y > 2 && b.y + b.h < H - 26;
      }
      // lit node dots are obstacles too, so labels never sit on them
      NODES.forEach(function (n) {
        if (fs && !fs[n.id]) return;
        var r = radius(n) + 1;
        placed.push({ x: n.sx - r, y: n.sy - r, w: 2 * r, h: 2 * r });
      });
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      NODES.slice().sort(function (a, b) { return prio(b) - prio(a); }).forEach(function (n) {
        var lit = !fs || fs[n.id];
        if (!lit && n.type === "tech") return;
        var h;
        if (n.type === "project") {
          ctx.font = "600 " + Math.round(12 + 1.5 * n.k) + "px Archivo, 'Helvetica Neue', Arial, sans-serif";
          ctx.fillStyle = colors.ink;
          h = 16;
        } else if (n.type === "lang") {
          ctx.font = "700 " + Math.round(11 + 1.5 * n.k) + "px 'Martian Mono', ui-monospace, monospace";
          ctx.fillStyle = colors.accent;
          h = 15;
        } else {
          ctx.font = "400 10px 'Martian Mono', ui-monospace, monospace";
          ctx.fillStyle = fs && fs[n.id] ? colors.ink : colors.ink2;
          h = 13;
        }
        var label = n.type === "lang" ? n.label.toUpperCase() : n.label;
        var tw = ctx.measureText(label).width;
        var r = radius(n);
        var right = { x: n.sx + r + 6, y: n.sy - h / 2, w: tw + 2, h: h };
        var left = { x: n.sx - r - 8 - tw, y: n.sy - h / 2, w: tw + 2, h: h };
        var box = clear(right) ? right : clear(left) ? left : null;
        if (!box) return;
        placed.push(box);
        var depthA = 0.3 + 0.7 * (n.depth + 1) / 2;
        ctx.globalAlpha = lit ? Math.min(1, depthA + 0.25) : 0.5;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = colors.paper;
        ctx.strokeText(label, box.x, n.sy);
        ctx.fillText(label, box.x, n.sy);
      });
      ctx.globalAlpha = 1;
    }

    /* panel */
    var elKind = document.getElementById("gp-kind");
    var elTitle = document.getElementById("gp-title");
    var elText = document.getElementById("gp-text");
    var elLinksLabel = document.getElementById("gp-links-label");
    var elLinks = document.getElementById("gp-links");
    var elOpen = document.getElementById("gp-open");
    var KIND = { project: "Project", lang: "Language", tech: "Tool or concept" };
    var RANK = { lang: 0, project: 1, tech: 2 };

    function renderPanel(n) {
      if (!elTitle) return;
      elKind.textContent = KIND[n.type];
      elTitle.textContent = n.label;
      elText.textContent = n.text;
      var nb = n.nb.slice().sort(function (a, b) { return RANK[a.type] - RANK[b.type] || a.label.localeCompare(b.label); });
      elLinksLabel.textContent = n.type === "project" ? "Built with (" + nb.length + ")" : "Used in (" + nb.length + ")";
      elLinks.innerHTML = "";
      nb.forEach(function (m) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-node", m.id);
        b.textContent = m.label;
        li.appendChild(b);
        elLinks.appendChild(li);
      });
      if (n.href) {
        elOpen.hidden = false;
        elOpen.href = n.href;
        elOpen.textContent = n.href === "#lab" ? "See the lab notebook ↓" : n.href === "#other" ? "See smaller builds ↓" : "Open case file ↑";
      } else {
        elOpen.hidden = true;
      }
    }

    function select(n, turn) {
      selected = n;
      renderPanel(n);
      if (turn) {
        targetYaw = Math.atan2(-n.x, n.z);
        targetPitch = -0.2;
      }
      kick();
    }

    if (elLinks) {
      elLinks.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-node]");
        if (!b) return;
        var n = byId[b.getAttribute("data-node")];
        if (n) {
          select(n, true);
          var first = elLinks.querySelector("button");
          if (first) first.focus({ preventScroll: true });
        }
      });
    }

    /* pointer */
    function hit(x, y) {
      var best = null, bestD = 18;
      NODES.forEach(function (n) {
        var d = Math.hypot(n.sx - x, n.sy - y) - radius(n);
        if (d < bestD || (best && d === bestD && n.depth > best.depth)) { best = n; bestD = d; }
      });
      return best;
    }

    var drag = null, lastInteract = 0;
    canvas.addEventListener("pointerdown", function (e) {
      var r = canvas.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch, moved: false, ox: r.left, oy: r.top };
      targetYaw = targetPitch = null;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; box.classList.add("is-dragging"); }
        if (drag.moved) {
          yaw = drag.yaw + dx * 0.008;
          pitch = Math.max(-1.25, Math.min(1.25, drag.pitch + dy * 0.006));
          lastInteract = performance.now();
          kick();
        }
        return;
      }
      if (e.pointerType !== "mouse") return;
      var h = hit(e.clientX - r.left, e.clientY - r.top);
      if (h !== hovered) {
        hovered = h;
        canvas.style.cursor = h ? "pointer" : "";
        kick();
      }
    });
    function endDrag(e) {
      if (!drag) return;
      var wasMove = drag.moved;
      var r = canvas.getBoundingClientRect();
      drag = null;
      box.classList.remove("is-dragging");
      lastInteract = performance.now();
      if (!wasMove && e && e.type === "pointerup") {
        var h = hit(e.clientX - r.left, e.clientY - r.top);
        if (h) select(h, false);
      }
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", function () {
      if (hovered) { hovered = null; canvas.style.cursor = ""; kick(); }
    });

    /* loop: only while on screen */
    var visible = false, raf = 0;
    function tick(t) {
      raf = 0;
      var animating = false;
      if (targetYaw !== null) {
        var d = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
        yaw += d * 0.08;
        pitch += (targetPitch - pitch) * 0.08;
        if (Math.abs(d) < 0.002 && Math.abs(targetPitch - pitch) < 0.002) { targetYaw = targetPitch = null; }
        animating = true;
      } else if (!reduceMotion.matches && !drag && !hovered && t - lastInteract > 2500) {
        yaw += 0.0016;
        animating = true;
      }
      draw();
      if (visible && animating) raf = requestAnimationFrame(tick);
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    readColors();
    renderPanel(selected);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box);
    else window.addEventListener("resize", resize);
    resize();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }).observe(box);
    } else {
      visible = true;
      kick();
    }

    onTheme(function () { readColors(); draw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  })();
})();
