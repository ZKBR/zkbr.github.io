// Interactive post-quantum explainer (/pq/): a toy learning-with-errors instance. No dependencies.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const q = 97, M = 4, N = 2;
  const SUB = ["₁", "₂", "₃", "₄"];
  const mod = (a) => ((a % q) + q) % q;
  const centered = (a) => { a = mod(a); return a > q / 2 ? a - q : a; };
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const inv = (a) => { a = mod(a); for (let i = 1; i < q; i++) if ((a * i) % q === 1) return i; return 0; };
  const SLIDES = { A: [[23, 41], [56, 9], [12, 88], [71, 34]], x: [27, 75], e: [0, 1, 0, -1] };

  let I = JSON.parse(JSON.stringify(SLIDES));
  const useErr = () => $("lwe-err").checked;
  const b = () => I.A.map((row, i) => mod(row[0] * I.x[0] + row[1] * I.x[1] + (useErr() ? I.e[i] : 0)));
  const residuals = (x, bv) => I.A.map((row, i) => centered(bv[i] - row[0] * x[0] - row[1] * x[1]));
  const fits = (r) => r.every((v) => Math.abs(v) <= (useErr() ? 1 : 0));

  function solutions() { // all x that fit, for checking uniqueness
    const bv = b(), out = [];
    for (let u = 0; u < q; u++) for (let v = 0; v < q; v++) if (fits(residuals([u, v], bv))) out.push([u, v]);
    return out;
  }

  function newInstance() {
    for (;;) {
      const A = Array.from({ length: M }, () => [rnd(q), rnd(q)]);
      const x = [rnd(q), rnd(q)];
      const e = Array.from({ length: M }, () => rnd(3) - 1);
      if (!mod(A[0][0] * A[1][1] - A[0][1] * A[1][0])) continue;   // the first two equations must be solvable
      if (!e[0] && !e[1]) continue;                                // elimination would get lucky
      I = { A, x, e };
      const was = $("lwe-err").checked; $("lwe-err").checked = true;
      const s = solutions(); $("lwe-err").checked = was;
      if (s.length === 1) return;
    }
  }

  function render(clear = true) {
    const bv = b(), show = $("lwe-show").checked, err = useErr();
    const rows = I.A.map((row, i) => {
      const e = err ? ` <span class="pq-e">+ ${show ? `<span class="pq-val">${I.e[i] < 0 ? "(−1)" : I.e[i]}</span>` : "e" + SUB[i]}</span>` : "";
      return `<div class="pq-row"><span class="pq-c">${row[0]}</span>·x₁ + <span class="pq-c">${row[1]}</span>·x₂${e} <span class="pq-op">≡</span> <span class="pq-b">${bv[i]}</span></div>`;
    }).join("");
    const secret = show ? `x = (<b>${I.x[0]}</b>, <b>${I.x[1]}</b>)` + (err ? `, e = (${I.e.map((v) => (v < 0 ? "−1" : v)).join(", ")})` : "") : "x = (?, ?)" + (err ? ", e = (?, ?, ?, ?), each −1, 0 or 1" : "");
    $("lwe-eq").innerHTML = `<div class="pq-rows">${rows}</div><div class="pq-mod">all modulo ${q} · secret: ${secret}</div>`;
    if (clear) { $("lwe-elim-out").textContent = ""; $("lwe-brute-out").textContent = ""; $("lwe-bar").style.width = "0"; }
  }

  function fmtRes(r) { return r.map((v, i) => `<span class="${Math.abs(v) <= (useErr() ? 1 : 0) ? "ok" : "bad"}">eq. ${i + 1}: off by ${v < 0 ? "−" + -v : v}</span>`).join(""); }

  $("lwe-elim").onclick = () => {
    const bv = b(), [[a, c], [d, f]] = I.A, di = inv(a * f - c * d);
    const x = [mod((bv[0] * f - c * bv[1]) * di), mod((a * bv[1] - d * bv[0]) * di)];
    const r = residuals(x, bv), ok = fits(r), right = x[0] === I.x[0] && x[1] === I.x[1];
    let msg = `Elimination gives x = (${x[0]}, ${x[1]}).<div class="pq-res">${fmtRes(r)}</div>`;
    if (ok && right) msg += useErr() ? '<p class="ok">✓ Lucky: both equations used had error 0.</p>' : '<p class="ok">✓ Found the secret instantly. Without errors, this is easy at any size.</p>';
    else msg += `<p class="bad">✗ Wrong. The errors in the first two equations were blown up by the elimination, so x fails the other equations.</p>`;
    $("lwe-elim-out").innerHTML = msg;
  };

  let searching = false;
  $("lwe-brute").onclick = async () => {
    if (searching) return; searching = true; $("lwe-brute").disabled = true;
    const bv = b(), t0 = performance.now(), total = q * q;
    let found = null, foundAt = 0, count = 0;
    for (let k = 0; k < total; k++) {
      const x = [Math.floor(k / q), k % q];
      if (fits(residuals(x, bv))) { count++; if (!found) { found = x; foundAt = k + 1; } }
      if (k % 160 === 159) { $("lwe-bar").style.width = ((k + 1) / total) * 100 + "%"; await new Promise(requestAnimationFrame); }
    }
    $("lwe-bar").style.width = "100%";
    const ms = Math.max(1, Math.round(performance.now() - t0));
    $("lwe-brute-out").innerHTML = found
      ? `<p class="ok">✓ Found x = (${found[0]}, ${found[1]}) after ${foundAt.toLocaleString("en")} of ${total.toLocaleString("en")} candidates.</p><p class="zk-small">${count === 1 ? "It is the only candidate that fits." : count + " candidates fit."} The search took ${ms} ms here, slowed down so you can watch it.</p>`
      : '<p class="bad">No candidate fits.</p>';
    searching = false; $("lwe-brute").disabled = false;
  };

  $("lwe-err").onchange = render;
  $("lwe-show").onchange = () => render(false);
  $("lwe-new").onclick = () => { newInstance(); render(); };
  $("lwe-slides").onclick = () => { I = JSON.parse(JSON.stringify(SLIDES)); render(); };
  render();

  // ---- scaling
  const NS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  const sup = (k) => `<sup>${k}</sup>`;
  function scale() {
    const n = NS[+$("sc").value], k = n * Math.log10(q);
    $("sc-n").textContent = n;
    const cand = k < 15 ? Math.round(Math.pow(q, n)).toLocaleString("en") : "about 10" + sup(Math.floor(k));
    const secs = k - 12; // at a trillion candidates per second
    let time;
    if (secs < 0) time = "less than a second";
    else if (secs < 4.9) time = `about ${Math.round(Math.pow(10, secs)).toLocaleString("en")} seconds`;
    else if (secs < 7.5) time = `about ${Math.round(Math.pow(10, secs) / 86400).toLocaleString("en")} days`;
    else time = "about 10" + sup(Math.floor(secs - 7.5)) + " years";
    let note = "";
    if (k > 80) note = "<p>That is more than the number of atoms in the observable universe (about 10<sup>80</sup>).</p>";
    if (n === 512) note += "<p>This is the size of ML-KEM-512, which uses q = 3,329: about 10<sup>1803</sup> candidates.</p>";
    $("sc-out").innerHTML = `<p><b>${cand}</b> candidates. At a trillion candidates per second: <b>${time}</b>.</p>${note}`;
  }
  $("sc").oninput = scale;
  scale();
})();
