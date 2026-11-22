// Interactive explainer for /explain/ (ZKBR). No dependencies.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 1. Outsourcing a computation ----------
  const trace = () => '<div class="zk-trace">' + Array.from({ length: 60 }, (_, i) => `<i style="animation-delay:${i * 12}ms;height:${30 + ((i * 37) % 70)}%"></i>`).join("") + "</div>";
  const ask = { to: "p", html: '<span class="arrow">Verifier → Prover</span>Please compute F(x).' };
  const res = { to: "v", html: '<span class="arrow">Prover → Verifier</span>The result is y.' };
  const STEPS = [
    { msgs: [ask], v: "", p: "",
      cap: "A weak computer, the <strong>verifier</strong>, asks a powerful one, the <strong>prover</strong>, to run a heavy computation F on input x. Think of a phone asking a cloud service, or a blockchain asking an off-chain server." },
    { msgs: [ask, res], v: "Should I trust y?", p: "Computed for hours.",
      cap: "The prover answers y. But why should the verifier believe it? The prover may be buggy, lazy, or dishonest, and the verifier cannot afford to redo the computation." },
    { msgs: [ask, res, { to: "v", html: '<span class="arrow">Prover → Verifier</span>…and here is the full execution trace w:' + trace() }],
      v: "Re-checks every step: as much work as computing F(x) itself.", p: "",
      cap: "First idea: the prover sends a <strong>long proof</strong>, the full execution trace. The verifier can check every step, but that is as slow as doing the computation. Nothing was gained." },
    { msgs: [ask, res, { to: "v", html: '<span class="arrow">Prover → Verifier</span>…and here is a short proof: <span class="zk-proof">π · 200 bytes</span>' }],
      v: '<span class="ok">✓ Verified in milliseconds.</span>', p: "",
      cap: "A <strong>succinct proof</strong> is short, and checking it is fast, whatever the size of the computation. A <strong>SNARK</strong> (Succinct Non-interactive ARgument of Knowledge) can be a few hundred bytes. It is one message: no back and forth." },
    { msgs: [ask, { to: "v", bad: true, html: '<span class="arrow">Cheating prover → Verifier</span>The result is y′. <span class="zk-proof">π′</span>' }],
      v: '<span class="bad">✗ Rejected.</span>', p: "Tries to cheat.",
      cap: "Two properties make a proof system useful. <strong>Completeness</strong>: if both sides are honest, the verifier accepts the correct result. <strong>Soundness</strong>: a cheating prover is caught, except with negligible probability." },
    { msgs: [ask, res, { to: "v", html: '<span class="arrow">Prover → Verifier</span><span class="zk-proof">π</span> reveals nothing about w.' }],
      v: '<span class="ok">✓ Correct</span>, and nothing more learned.', p: '<span class="zk-secret">🔒 private input w</span>',
      cap: "Sometimes the computation also uses <strong>private data</strong> w, such as a balance, an identity document or a model's weights. A <strong>zero-knowledge</strong> proof convinces the verifier that y is correct while revealing nothing about w. That is an extra property: a succinct proof need not have it." },
  ];
  let step = 0;
  function renderStep() {
    const s = STEPS[step], ch = $("os-channel");
    ch.textContent = "";
    s.msgs.forEach((m, i) => { const d = el("div", "zk-msg " + (m.to === "p" ? "to-p" : "to-v") + (m.bad ? " bad" : ""), m.html); d.style.animationDelay = (i === s.msgs.length - 1 ? 0.1 : 0) + "s"; if (i < s.msgs.length - 1) d.style.animation = "none"; ch.appendChild(d); });
    $("os-vstatus").innerHTML = s.v; $("os-pstatus").innerHTML = s.p; $("os-caption").innerHTML = s.cap;
    $("os-back").disabled = step === 0; $("os-next").disabled = step === STEPS.length - 1;
    $("os-dots").innerHTML = STEPS.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("");
  }
  $("os-back").onclick = () => { if (step > 0) { step--; renderStep(); } };
  $("os-next").onclick = () => { if (step < STEPS.length - 1) { step++; renderStep(); } };
  renderStep();

  // ---------- 2. Private vs succinct ----------
  const EX = [
    { name: "Blum’s circuit proof (section 3)", x: 130, y: 215, txt: "<strong>Zero-knowledge, not succinct.</strong> The verifier learns nothing about the circuit, but needs many rounds, and each round sends a sealed box for every entry of the matrix." },
    { name: "Groth16, as in Zcash", x: 280, y: 238, txt: "<strong>Both.</strong> A proof of about 200 bytes, checked in milliseconds, and the transaction details stay hidden. This is a zk-SNARK in the full sense." },
    { name: "A zkVM without its privacy mode", x: 430, y: 215, txt: "<strong>Succinct, not zero-knowledge.</strong> Several zkVMs produce proofs that are short and fast to check but do not hide the inputs by default, despite the “zk” in the name." },
    { name: "Sending the whole trace", x: 505, y: 296, txt: "<strong>Neither.</strong> The verifier re-checks every step, which is as slow as computing, and it sees all the data." },
  ];
  const chips = $("venn-chips");
  EX.forEach((e, i) => {
    const b = el("button", "zk-chip", e.name); b.type = "button";
    b.onclick = () => { [...chips.children].forEach((c) => c.classList.remove("on")); b.classList.add("on"); const d = $("venn-dot"); d.style.opacity = 1; d.setAttribute("cx", e.x); d.setAttribute("cy", e.y); $("venn-explain").innerHTML = e.txt; };
    chips.appendChild(b);
  });

  // ---------- 3. Blum's Hamiltonian-circuit protocol ----------
  const N = 6, NAMES = "ABCDEF", BOXES = N * (N - 1), WORD = "six";
  const CYCLE = [0, 2, 4, 1, 5, 3];                    // the prover's secret circuit in G
  const EXTRA = [[0, 1], [2, 3], [4, 5]];
  const G = Array.from({ length: N }, () => Array(N).fill(0));
  const addE = (M, a, b) => { M[a][b] = M[b][a] = 1; };
  CYCLE.forEach((v, i) => addE(G, v, CYCLE[(i + 1) % N]));
  EXTRA.forEach(([a, b]) => addE(G, a, b));
  const POS = Array.from({ length: N }, (_, i) => { const t = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [120 + 82 * Math.cos(t), 120 + 82 * Math.sin(t)]; });
  const LPOS = POS.map(([x, y]) => [120 + (x - 120) * 1.36, 124 + (y - 120) * 1.36]);
  const cycEdges = (cyc) => new Set(cyc.map((v, i) => { const w = cyc[(i + 1) % cyc.length]; return Math.min(v, w) + "-" + Math.max(v, w); }));

  function drawGraph(svg, M, { labels, mapLabels, cycle, onlyCycle, empty } = {}) {
    svg.textContent = "";
    if (empty) { svg.appendChild(sv("text", { x: 120, y: 120, class: "empty" })).textContent = empty; return; }
    const cs = cycle ? cycEdges(cycle) : new Set();
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
      const inC = cs.has(a + "-" + b);
      if (onlyCycle ? !inC : !M[a][b]) continue;
      svg.appendChild(sv("line", { x1: POS[a][0], y1: POS[a][1], x2: POS[b][0], y2: POS[b][1], class: "e" + (inC ? " cyc" : "") }));
    }
    for (let v = 0; v < N; v++) {
      svg.appendChild(sv("circle", { cx: POS[v][0], cy: POS[v][1], r: 14, class: "v" }));
      svg.appendChild(sv("text", { x: POS[v][0], y: POS[v][1], class: "vl" })).textContent = labels[v];
      if (mapLabels) svg.appendChild(sv("text", { x: LPOS[v][0], y: LPOS[v][1], class: "map" })).textContent = mapLabels[v];
    }
  }

  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  async function commit(bit) {
    const nonce = hex(crypto.getRandomValues(new Uint8Array(8)));
    const h = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bit + "|" + nonce))));
    return { bit, nonce, h };
  }

  let R = null, busy = false;
  const S = { passed: 0, caught: 0, round: 0 };
  const cheat = () => $("g-cheat").checked;
  const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
  const LBL = Array.from({ length: N }, (_, i) => String(i + 1));

  async function newRound() {
    const perm = shuffle([...Array(N).keys()]);         // perm[v] = new name of public vertex v
    const H = Array.from({ length: N }, () => Array(N).fill(0));
    let known = null, guess = null;
    if (!cheat()) {
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) H[perm[a]][perm[b]] = G[a][b];
      known = CYCLE.map((v) => perm[v]);
    } else {
      guess = rnd(2);                                      // the cheater bets on the challenge
      if (guess === 0) { for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) H[perm[a]][perm[b]] = G[a][b]; }
      else { known = shuffle([...Array(N).keys()]); known.forEach((v, i) => addE(H, v, known[(i + 1) % N])); }
    }
    const C = [];
    for (let i = 0; i < N; i++) { C.push([]); for (let j = 0; j < N; j++) C[i].push(i === j ? null : await commit(H[i][j])); }
    S.round++;
    R = { perm, H, C, known, guess, opened: null, cells: new Set() };
    renderMatrix(); drawGraph($("g-open"), null, { empty: "Nothing opened yet." }); $("g-open-note").textContent = ""; $("g-open-title").textContent = "What was opened";
    $("g-turn").innerHTML = `Round ${S.round}. The prover has sealed a scrambled copy of the graph. <strong>Your challenge?</strong>`;
    setButtons();
  }

  function renderMatrix(marks = {}) {
    const m = $("g-matrix"); m.textContent = ""; m.style.gridTemplateColumns = `1.2em repeat(${N}, minmax(0, 1fr))`;
    m.appendChild(el("div", "hd", ""));
    LBL.forEach((l) => m.appendChild(el("div", "hd", l)));
    for (let i = 0; i < N; i++) {
      m.appendChild(el("div", "hd", LBL[i]));
      for (let j = 0; j < N; j++) {
        if (i === j) { m.appendChild(el("div", "zk-box diag", "")); continue; }
        const c = R.C[i][j], k = i + "," + j, open = R.cells.has(k);
        const b = el("div", "zk-box " + (open ? "open" + (c.bit ? " one" : "") : "sealed"), open ? String(c.bit) : LOCK);
        if (marks.cyc && marks.cyc.has(k)) b.classList.add("cyc");
        if (marks.wrong && marks.wrong.has(k)) b.classList.add("wrong");
        b.title = open ? `bit ${c.bit}, nonce ${c.nonce}` : `SHA-256 = ${c.h}`;
        m.appendChild(b);
      }
    }
    $("g-matrix-note").textContent = R.cells.size ? `${R.cells.size} of ${BOXES} boxes opened. Each opening is checked against its hash.` : "Each box holds one bit (1 = edge, 0 = no edge), sealed so that you cannot see it and the prover cannot change it. Hover over a box to see its seal, a SHA-256 hash.";
  }

  function setButtons() {
    const done = S.caught > 0, open = !!R && R.opened !== null;
    $("g-c0").disabled = $("g-c1").disabled = busy || done || !R || open;
    $("g-next").disabled = busy || done || !open;
    $("g-auto").disabled = busy || done;
    $("g-cheat").disabled = busy;
    $("g-peek").disabled = cheat();
  }

  async function verifyHashes(cells) {
    for (const k of cells) { const [i, j] = k.split(",").map(Number), c = R.C[i][j]; const h = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(c.bit + "|" + c.nonce)))); if (h !== c.h) return false; }
    return true;
  }

  async function challenge(c, fast = false) {
    if (!R || R.opened !== null) return;
    R.opened = c;
    let ok, msg, marks = {};
    if (c === 0) {
      // open everything and the renaming; the verifier compares with the public graph
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) R.cells.add(i + "," + j);
      const wrong = new Set();
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (a !== b && R.H[R.perm[a]][R.perm[b]] !== G[a][b]) wrong.add(R.perm[a] + "," + R.perm[b]);
      marks.wrong = wrong; ok = wrong.size === 0;
      const inv = []; R.perm.forEach((nv, v) => (inv[nv] = NAMES[v]));
      drawGraph($("g-open"), R.H, { labels: LBL, mapLabels: inv.map((x) => "= " + x) });
      $("g-open-title").textContent = "Opened: the whole scrambled graph";
      $("g-open-note").textContent = "The renaming is revealed too, for example 1 = " + inv[0] + ". It is random, so it says nothing about the circuit.";
      msg = ok ? `All ${BOXES} boxes match the public graph under the renaming.` : `${wrong.size} boxes do not match the public graph. The prover sealed a different graph.`;
    } else {
      let cyc = R.known;
      if (!cyc) {                                           // a cheater without a circuit must open something
        do { cyc = shuffle([...Array(N).keys()]); } while (cyc.every((v, i) => R.H[v][cyc[(i + 1) % N]] === 1));
      }
      const cells = cyc.map((v, i) => v + "," + cyc[(i + 1) % N]);
      cells.forEach((k) => R.cells.add(k));
      const zeros = new Set(cells.filter((k) => { const [i, j] = k.split(",").map(Number); return R.C[i][j].bit !== 1; }));
      ok = zeros.size === 0 && new Set(cyc).size === N;
      marks.cyc = new Set(cells.filter((k) => !zeros.has(k))); marks.wrong = zeros;
      drawGraph($("g-open"), null, { labels: LBL, cycle: cyc, onlyCycle: true });
      $("g-open-title").textContent = `Opened: ${WORD} boxes, one per row and column`;
      $("g-open-note").textContent = ok ? `A round trip through ${WORD} renamed points. Any ${WORD} points could give this picture.` : "The prover claimed this round trip, but some of its edges do not exist.";
      msg = ok ? `The ${WORD} opened boxes all contain 1 and form one round trip through all ${WORD} vertices.` : (zeros.size === 1 ? "One of the opened boxes contains 0: that edge does not exist." : `${zeros.size} of the opened boxes contain 0: those edges do not exist.`) + " The prover does not know a circuit.";
    }
    renderMatrix(marks);
    const hashes = await verifyHashes(R.cells);
    if (!hashes) { ok = false; msg = "An opening does not match its hash."; }
    if (ok) S.passed++; else S.caught = S.round;
    $("g-turn").innerHTML = (ok ? '<span class="ok">✓ Accepted.</span> ' : '<span class="bad">✗ Caught!</span> ') + msg;
    renderScore(); setButtons();
    if (!fast) await sleep(0);
  }

  function renderScore() {
    const k = S.passed;
    let t;
    if (S.caught) t = `The prover was caught in round <b>${S.caught}</b>, after passing ${k} round${k === 1 ? "" : "s"}. Press “Start over” to try again.`;
    else if (!k) t = "Rounds accepted: <b>0</b>.";
    else { const p = Math.pow(2, k); t = `Rounds accepted: <b>${k}</b>. A prover without a circuit survives this far with probability 1 in <b>${p.toLocaleString("en")}</b>.`; }
    $("g-score").innerHTML = t;
  }

  async function reset() {
    S.passed = 0; S.caught = 0; S.round = 0; R = null;
    renderScore(); await newRound();
  }

  $("g-c0").onclick = () => challenge(0);
  $("g-c1").onclick = () => challenge(1);
  $("g-next").onclick = () => newRound();
  $("g-reset").onclick = () => reset();
  $("g-cheat").onchange = () => { $("g-peek").checked = false; drawPublic(); reset(); };
  $("g-peek").onchange = drawPublic;
  $("g-auto").onclick = async () => {
    busy = true; setButtons();
    for (let r = 0; r < 20 && !S.caught; r++) {
      if (R.opened !== null) await newRound();
      await sleep(250); await challenge(rnd(2), true); await sleep(350);
    }
    busy = false; setButtons();
  };
  function drawPublic() { drawGraph($("g-public"), G, { labels: NAMES.split(""), cycle: $("g-peek").checked && !cheat() ? CYCLE : null }); }
  drawPublic();
  reset();
})();
