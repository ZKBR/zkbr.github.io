// Interactive post-quantum explainer (/pq/): a toy learning-with-errors instance. No dependencies.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const QS = [97, 3329, 12289, 8380417];
  let q = 97;
  const NS = [2, 3, 4, 5, 6, 8, 16, 32, 64, 128, 256, 512, 1024];
  const SHOW_MAX = 6, SEARCH_LIMIT = 1.2e7; // largest number of candidates the browser searches
  const mod = (a) => ((a % q) + q) % q;
  const centered = (a) => { a = mod(a); return a > q / 2 ? a - q : a; };
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const inv = (a) => { let [r0, r1, s0, s1] = [mod(a), q, 1, 0]; while (r1) { const t = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - t * r1]; [s0, s1] = [s1, s0 - t * s1]; } return r0 === 1 ? mod(s0) : 0; };
  const fmt = (v) => v.toLocaleString("en");
  const minus = (v) => (v < 0 ? "−" + -v : String(v));
  const sup = (k) => `<sup>${k}</sup>`;
  const SLIDES = { A: [[23, 41], [56, 9], [12, 88], [71, 34]], x: [27, 75], e: [0, 1, 0, -1] };

  let n = 2, I = JSON.parse(JSON.stringify(SLIDES)), rate = 5e6; // candidates per second, measured on the first search
  const m = () => 2 * n;
  const useErr = () => $("lwe-err").checked;
  const dot = (row, x) => row.reduce((s, a, j) => s + a * x[j], 0);
  const bOf = (err) => I.A.map((row, i) => mod(dot(row, I.x) + (err ? I.e[i] : 0)));
  const residuals = (x, bv) => I.A.map((row, i) => centered(bv[i] - dot(row, x)));
  const fitsWith = (r, err) => r.every((v) => Math.abs(v) <= (err ? 1 : 0));

  // Solve the square system given by the first n rows (Gaussian elimination mod q); null if singular.
  function solveFirst(bv) {
    const M = I.A.slice(0, n).map((row, i) => [...row, bv[i]]);
    for (let c = 0; c < n; c++) {
      const p = M.findIndex((r, i) => i >= c && mod(r[c]) !== 0); if (p < 0) return null;
      [M[c], M[p]] = [M[p], M[c]];
      const iv = inv(M[c][c]); M[c] = M[c].map((v) => mod(v * iv));
      for (let r = 0; r < n; r++) if (r !== c && M[r][c]) { const f = M[r][c]; M[r] = M[r].map((v, j) => mod(v - f * M[c][j])); }
    }
    return M.map((r) => r[n]);
  }
  function countFits(bv, err, limit = Infinity) {
    let c = 0; const x = Array(n).fill(0), total = Math.pow(q, n);
    for (let k = 0; k < total; k++) {
      let t = k; for (let j = n - 1; j >= 0; j--) { x[j] = t % q; t = Math.floor(t / q); }
      if (fitsWith(residuals(x, bv), err) && ++c >= limit) return c;
    }
    return c;
  }
  function newInstance() {
    for (;;) {
      const A = Array.from({ length: m() }, () => Array.from({ length: n }, () => rnd(q)));
      const x = Array.from({ length: n }, () => rnd(q));
      const e = Array.from({ length: m() }, () => rnd(3) - 1);
      if (e.slice(0, n).every((v) => !v)) continue;          // elimination on the first n rows would get lucky
      I = { A, x, e };
      if (!solveFirst(bOf(false))) continue;                  // the first n equations must be solvable
      if (Math.pow(q, n) <= 1e6 && countFits(bOf(true), true, 2) !== 1) continue; // unique answer for the search (for larger q a second fit is vanishingly unlikely)
      return;
    }
  }

  const col = (vals, cls = "") => `<div class="pq-mat pq-vec ${cls}">${vals.map((v) => `<span>${v}</span>`).join("")}</div>`;
  function render(clear = true) {
    const err = useErr(), show = $("lwe-show").checked, total = Math.pow(q, n);
    $("lwe-size").textContent = `${n} unknowns, ${m()} equations`;
    const searchable = total <= SEARCH_LIMIT;
    if (n <= SHOW_MAX) {
      const bv = bOf(err);
      const A = `<div class="pq-mat" style="grid-template-columns:repeat(${n},auto)">${I.A.flat().map((v) => `<span>${v}</span>`).join("")}</div>`;
      const x = col(I.x.map((v) => (show ? v : "?")), "pq-secret");
      const e = err ? `<span class="pq-op">+</span><div class="pq-mat pq-vec pq-errv">${I.e.map((v, i) => `<button type="button" data-i="${i}" title="Click to change">${minus(v)}</button>`).join("")}</div>` : "";
      $("lwe-eq").innerHTML = `<div class="pq-matrix-eq"><div class="pq-lab">A</div><div></div><div class="pq-lab">x</div>${err ? '<div></div><div class="pq-lab">e</div>' : ""}<div></div><div class="pq-lab">b</div>
        ${A}<span class="pq-op">·</span>${x}${e}<span class="pq-op">≡</span>${col(bv, "pq-bvec")}</div><div class="pq-mod">modulo ${fmt(q)}</div>${err ? '<p class="pq-note">Click an entry of e to change it. In real LWE the error is secret too; here you see it so you can watch what it does.</p>' : ""}`;
      $("lwe-eq").querySelector(".pq-matrix-eq").style.gridTemplateColumns = err ? "auto auto auto auto auto auto auto" : "auto auto auto auto auto";
    } else {
      $("lwe-eq").innerHTML = `<p class="pq-big">Too large to show: A has ${m()} × ${n} = ${(m() * n).toLocaleString("en")} entries. The attacks below are shown as estimates.</p>`;
    }
    $("lwe-elim").disabled = n > SHOW_MAX;
    $("lwe-elim-txt").textContent = `Solve the first ${n} equations exactly, then check the result against the other ${n}.`;
    const k = n * Math.log10(q);
    const cand = k < 15 ? total.toLocaleString("en") : "about 10" + sup(Math.floor(k));
    const secs = k - Math.log10(rate);
    let here;
    if (secs < 0) here = "under a second"; else if (secs < 4.9) here = `about ${Math.round(Math.pow(10, secs)).toLocaleString("en")} seconds`;
    else if (secs < 7.5) here = `about ${Math.round(Math.pow(10, secs) / 86400).toLocaleString("en")} days`;
    else here = "about 10" + sup(Math.floor(secs - 7.5)) + " years";
    const t12 = k - 12;
    const tera = t12 < 7.5 ? "" : ` Even at a trillion candidates per second: about 10${sup(Math.floor(t12 - 7.5))} years.`;
    let note = "";
    if (k > 80) note += " That is more candidates than atoms in the observable universe (about 10" + sup(80) + ").";
    if (n === 512) note += " ML-KEM-512 has 512 unknowns modulo 3,329: about 10" + sup(1803) + " candidates.";
    $("lwe-brute-txt").innerHTML = `Test all ${fmt(q)}${sup(n)} = <b>${cand}</b> candidates: x is a solution if every equation is off by at most 1. In this browser: ${here}.${tera}${note}`;
    $("lwe-brute").disabled = !searchable;
    if (clear) { $("lwe-elim-out").textContent = ""; $("lwe-brute-out").innerHTML = !searchable && n <= SHOW_MAX ? '<p class="zk-small">Too slow to run here.</p>' : ""; $("lwe-bar").style.width = "0"; }
  }

  const fmtX = (x) => "(" + x.join(", ") + ")";
  $("lwe-elim").onclick = () => {
    const err = useErr(), bv = bOf(err), x = solveFirst(bv), r = residuals(x, bv), ok = fitsWith(r, err);
    const bad = r.map((v, i) => [i, v]).filter(([, v]) => Math.abs(v) > (err ? 1 : 0));
    let msg = `Elimination gives x = ${fmtX(x)}.`;
    if (ok) msg += `<p class="ok">✓ ${err ? `Found x: the first ${n} equations have error 0, so elimination works. Put an error in one of them and try again.` : "Found the secret instantly. Without errors, this is easy at any size."}</p>`;
    else msg += `<div class="pq-res">${bad.slice(0, 4).map(([i, v]) => `<span class="bad">eq. ${i + 1}: off by ${minus(v)}</span>`).join("")}${bad.length > 4 ? `<span class="bad">and ${bad.length - 4} more</span>` : ""}</div><p class="bad">✗ Wrong. The small errors in the first ${n} equations were blown up by the elimination, so x fails ${bad.length === 1 ? "another equation" : bad.length + " of the other equations"}.</p>`;
    $("lwe-elim-out").innerHTML = msg;
  };

  let searching = false;
  $("lwe-brute").onclick = async () => {
    if (searching || Math.pow(q, n) > SEARCH_LIMIT) return; searching = true; $("lwe-brute").disabled = true; $("lwe-n").disabled = true; $("lwe-q").disabled = true;
    const err = useErr(), bv = bOf(err), total = Math.pow(q, n), chunk = Math.max(160, Math.ceil(total / 60));
    const t0 = performance.now(), x = Array(n).fill(0);
    let found = null, foundAt = 0, count = 0, work = 0;
    for (let k = 0; k < total; k++) {
      let t = k; for (let j = n - 1; j >= 0; j--) { x[j] = t % q; t = Math.floor(t / q); }
      if (fitsWith(residuals(x, bv), err)) { count++; if (!found) { found = x.slice(); foundAt = k + 1; } }
      if (k % chunk === chunk - 1) { const w0 = performance.now(); $("lwe-bar").style.width = ((k + 1) / total) * 100 + "%"; await new Promise(requestAnimationFrame); work -= performance.now() - w0; }
    }
    const ms = Math.max(1, performance.now() - t0 + work);
    if (total >= 5e5) rate = total / (ms / 1000);
    $("lwe-bar").style.width = "100%";
    $("lwe-brute-out").innerHTML = found
      ? `<p class="ok">✓ Found x = ${fmtX(found)} after ${foundAt.toLocaleString("en")} of ${total.toLocaleString("en")} candidates.</p><p class="zk-small">${count === 1 ? "It is the only candidate that fits." : count.toLocaleString("en") + " candidates fit."}</p>`
      : '<p class="bad">No candidate fits.</p>';
    searching = false; $("lwe-n").disabled = false; $("lwe-q").disabled = false; render(false);
  };

  $("lwe-err").onchange = () => render();
  $("lwe-show").onchange = () => render(false);
  $("lwe-new").onclick = () => { if (n <= SHOW_MAX) newInstance(); render(); };
  $("lwe-slides").onclick = () => { n = 2; q = 97; $("lwe-n").value = 0; $("lwe-q").value = "97"; I = JSON.parse(JSON.stringify(SLIDES)); render(); };
  $("lwe-q").onchange = () => { q = +$("lwe-q").value; if (n <= SHOW_MAX) newInstance(); render(); };
  $("lwe-eq").addEventListener("click", (ev) => { const btn = ev.target.closest("button[data-i]"); if (!btn || searching) return; const i = +btn.dataset.i; I.e[i] = I.e[i] === 1 ? -1 : I.e[i] + 1; render(); });
  $("lwe-n").oninput = () => { n = NS[+$("lwe-n").value]; if (n <= SHOW_MAX) newInstance(); render(); };
  render();
})();
