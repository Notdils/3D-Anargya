// Loading screen speedometer: jarum & angka 0–100 mengikuti progress loading yang sebenarnya.
// Tahap: halaman terbaca → font siap → model 3D hero tampil → semua aset selesai (window load).

const root = document.getElementById("loader");
if (root && !document.documentElement.classList.contains("no-loader")) run(root);

function run(root: HTMLElement) {
  const ticks = document.getElementById("loader-ticks")!;
  const labels = document.getElementById("loader-labels")!;
  const needle = document.getElementById("loader-needle")!;
  const valueEl = document.getElementById("loader-value")!;
  const NS = "http://www.w3.org/2000/svg";
  const START = -225, SWEEP = 270; // derajat, 0 = kanan, searah jarum jam
  const COUNT = 41; // satu garis tiap 2,5
  const angle = (v: number) => START + (v / 100) * SWEEP;
  const polar = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  };

  // Garis-garis skala (yang ke-4 lebih panjang) + angka 0, 20, ..., 100
  const tickEls: SVGLineElement[] = [];
  for (let i = 0; i < COUNT; i++) {
    const v = (i / (COUNT - 1)) * 100;
    const major = i % 8 === 0;
    const [x1, y1] = polar(angle(v), major ? 70 : 76);
    const [x2, y2] = polar(angle(v), 90);
    const line = document.createElementNS(NS, "line");
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, n]) => line.setAttribute(k, n.toFixed(2)));
    line.setAttribute("stroke-width", major ? "4" : "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke", "rgba(255,255,255,.12)");
    ticks.appendChild(line);
    tickEls.push(line);
    if (major) {
      const [tx, ty] = polar(angle(v), 58);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", tx.toFixed(1));
      t.setAttribute("y", (ty + 3).toFixed(1));
      t.textContent = String(Math.round(v));
      labels.appendChild(t);
    }
  }

  document.documentElement.style.overflow = "hidden";
  document.getElementById("loader-gauge")!.classList.add("is-ready"); // tampil setelah skala lengkap

  // Target progress naik sesuai tahap; angka tampil mengejar target dengan halus
  let target = 10;
  const raise = (v: number) => (target = Math.max(target, v));
  document.fonts?.ready.then(() => raise(40));
  addEventListener("anargya:scene-ready", () => raise(75), { once: true });
  const onLoad = () => raise(100);
  if (document.readyState === "complete") onLoad();
  else addEventListener("load", onLoad, { once: true });
  setTimeout(() => raise(100), 6000); // pengaman: jangan pernah tertahan

  const MIN_MS = 3000; // durasi minimum supaya gerakan jarum terlihat dan diperhatikan
  const t0 = performance.now();
  let shown = 0;
  let last = t0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // jangan melewati batas waktu minimum: maksimum (waktu berjalan / MIN_MS) × 100
    const cap = Math.min(target, ((now - t0) / MIN_MS) * 100);
    shown += (cap - shown) * Math.min(1, dt * 6);
    if (cap - shown < 0.4) shown = cap;

    needle.setAttribute("transform", `rotate(${angle(shown).toFixed(2)} 100 100)`);
    const v = Math.round(shown);
    valueEl.textContent = String(v);
    root.setAttribute("aria-valuenow", String(v));
    const lit = Math.round((shown / 100) * (COUNT - 1));
    tickEls.forEach((el, i) => el.setAttribute("stroke", i <= lit && shown > 0.5 ? "#29d970" : "rgba(255,255,255,.12)"));

    if (shown >= 100) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function finish() {
    try { sessionStorage.setItem("anargya-loaded", "1"); } catch { /* abaikan */ }
    setTimeout(() => {
      root.classList.add("is-done");
      document.documentElement.style.overflow = "";
      setTimeout(() => root.remove(), 600);
    }, 250);
  }
}
