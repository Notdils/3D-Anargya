import "./style.css";
import "./game.css";
import * as THREE from "three";
import { kartVehicle, f1Vehicle, type Vehicle } from "./vehicles";

// ================= Konstanta =================
const LAPS = 1;
const TRACK_WIDTH = 9;
const MAX_SPEED = 20; // m/s ≈ 72 km/h
const OFF_MAX_SPEED = 7;
const ACCEL = 9;
const BRAKE = 26;
const DRAG = 0.6;
const STEER_RATE = 2.1; // rad/s
const BEST_KEY = "anargya-best-its"; // + "-kart" / "-f1"
const GHOST_KEY = "anargya-ghost-its"; // + "-kart" / "-f1"
const GHOST_STEP = 50; // ms antar sampel rekaman ghost (20 Hz)

// ================= Lintasan =================
// Sirkuit ITS, dijiplak dari citra satelit Google Maps (piksel tangkapan layar, utara = atas).
// Urutan mengikuti arah balap: naik di lurusan kanan → putaran atas → turun di lurusan kiri →
// tikungan S & hairpin di bawah → kembali ke lurusan kanan. Garis start ada di titik pertama.
const MAP_PX: [number, number][] = [
  [955, 655], [925, 580], [905, 515], [882, 445], [862, 370], [850, 300], [848, 255], [825, 225], [795, 218],
  [762, 228], [742, 262], [752, 300], [775, 330], [810, 380], [838, 440], [852, 510], [862, 580], [862, 630],
  [855, 710], [825, 770], [780, 830], [772, 870], [800, 885], [845, 850], [880, 800], [887, 745], [892, 687],
  [910, 677], [920, 700], [927, 750], [957, 805], [960, 840], [925, 857], [870, 867], [855, 890], [870, 925],
  [925, 932], [990, 930], [1012, 900], [1005, 840], [980, 745],
];
const M_PER_PX = 0.45; // ±1 km per lap (sedikit diperkecil dari aslinya supaya 1 lap ±1 menit)
const CONTROL = MAP_PX.map(([x, y]) => [(x - 880) * M_PER_PX, (y - 575) * M_PER_PX] as const);
const curve = new THREE.CatmullRomCurve3(CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
const N = 1200;
const pts = curve.getSpacedPoints(N).slice(0, N);
const tangents = pts.map((_, i) => curve.getTangentAt(i / N));

// ================= Renderer & scene =================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9d6f5);
scene.fog = new THREE.Fog(0xa9d6f5, 60, 190);
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 400);

scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 1.3));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun, sun.target);

// Rumput
const grass = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1 }));
grass.rotation.x = -Math.PI / 2;
grass.receiveShadow = true;
scene.add(grass);

/** Pita di sepanjang lintasan, dari offset a ke b (meter dari garis tengah). */
function ribbon(a: number, b: number, y: number, color: (i: number) => THREE.Color) {
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i % N], t = tangents[i % N];
    const nx = -t.z, nz = t.x; // normal ke kanan lintasan (tidak berpengaruh, pita simetris)
    const c = color(i % N);
    pos.push(p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // polygonOffset: cegah z-fighting (berkedip) dengan rumput saat dilihat dari jauh
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 * y * 100 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const asphalt = new THREE.Color(0x2b2d30);
const white = new THREE.Color(0xf4f4f4), red = new THREE.Color(0xd8322a), green = new THREE.Color(0x29d970);
const half = TRACK_WIDTH / 2;
ribbon(-half, half, 0.02, () => asphalt);
ribbon(half - 0.3, half - 0.1, 0.04, () => white);
ribbon(-half + 0.1, -half + 0.3, 0.04, () => white);
// kerb merah-putih
ribbon(half, half + 0.8, 0.03, (i) => (Math.floor(i / 6) % 2 ? red : white));
ribbon(-half - 0.8, -half, 0.03, (i) => (Math.floor(i / 6) % 2 ? red : white));
// garis start/finish (hijau Anargya)
{
  const p = pts[0], t = tangents[0];
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1.2, TRACK_WIDTH), new THREE.MeshBasicMaterial({ color: green, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -20 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = Math.atan2(-t.z, t.x);
  line.position.set(p.x, 0.05, p.z);
  scene.add(line);
}

// Tumpukan ban di luar tikungan & pohon (posisi tetap, bukan acak)
const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const tireGeo = new THREE.TorusGeometry(0.32, 0.14, 6, 10);
for (let i = 0; i < N; i += 18) {
  const p = pts[i], t = tangents[i];
  const side = i % 36 === 0 ? 1 : -1;
  const off = half + 2.2;
  for (let s = 0; s < 3; s++) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(p.x - t.z * off * side, 0.14 + s * 0.24, p.z + t.x * off * side);
    tire.castShadow = true;
    scene.add(tire);
  }
}
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: true });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b36, flatShading: true });
const treeBox = new THREE.Box3().setFromPoints(pts);
const treeC = treeBox.getCenter(new THREE.Vector3()), treeR = treeBox.getSize(new THREE.Vector3()).length() / 2 + 25;
for (let i = 0; i < 90; i++) {
  const a = (i / 90) * Math.PI * 2;
  const r = treeR + ((i * 37) % 40);
  const x = treeC.x + Math.cos(a) * r, z = treeC.z + Math.sin(a) * r;
  const h = 6 + ((i * 13) % 5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, h * 0.4, 5), trunkMat);
  trunk.position.set(x, h * 0.2, z);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, h, 6), leafMat);
  leaf.position.set(x, h * 0.4 + h / 2 - 0.5, z);
  scene.add(trunk, leaf);
}

// ================= Kendaraan =================
// Default: kart Anargya. F1 dimuat hanya jika dipilih (file ±1,6 MB).
const vehicles: { kart: Vehicle; f1?: Vehicle } = { kart: kartVehicle() };
let car: Vehicle = vehicles.kart;
let carId: "kart" | "f1" = "kart";
scene.add(car.group);

// ================= Ghost car =================
// Merekam posisi tiap 50 ms selama lap; lap terbaik disimpan di localStorage dan diputar ulang
// sebagai kendaraan hijau transparan di lap berikutnya.
type GhostData = { time: number; x: number[]; z: number[]; h: number[] };
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x29d970, transparent: true, opacity: 0.35, depthWrite: false });
const ghosts: Partial<Record<"kart" | "f1", THREE.Object3D>> = {};
let ghostData: GhostData | null = null;
const rec = { x: [] as number[], z: [] as number[], h: [] as number[], next: 0 };

function ghostFor(id: "kart" | "f1", source: THREE.Object3D) {
  if (!ghosts[id]) {
    const g = source.clone(true);
    g.rotation.set(0, 0, 0); // clone menyalin rotasi lewat quaternion: bisa jadi (π, y, π), jadi nolkan
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; }
    });
    g.visible = false;
    scene.add(g);
    ghosts[id] = g;
  }
  return ghosts[id]!;
}
function readGhost(): GhostData | null {
  try { return JSON.parse(localStorage.getItem(`${GHOST_KEY}-${carId}`) ?? "null"); } catch { return null; }
}
function saveGhost(time: number) {
  const r = (a: number[]) => a.map((v) => Math.round(v * 100) / 100); // 2 desimal cukup, hemat ruang
  const data: GhostData = { time, x: r(rec.x), z: r(rec.z), h: r(rec.h) };
  try { localStorage.setItem(`${GHOST_KEY}-${carId}`, JSON.stringify(data)); } catch { /* storage penuh/tidak ada */ }
}
function resetRecording() {
  rec.x = []; rec.z = []; rec.h = []; rec.next = 0;
}
function updateGhost(now: number) {
  const g = ghosts[carId];
  if (!g) return;
  if (!state.running || !ghostData) { g.visible = false; return; }
  const f = (now - state.lapStart) / GHOST_STEP;
  const i = Math.floor(f), k = f - i, last = ghostData.x.length - 1;
  if (i >= last) { g.visible = false; return; } // ghost sudah finish
  const lerp = (a: number[]) => a[i] + (a[i + 1] - a[i]) * k;
  g.position.set(lerp(ghostData.x), 0, lerp(ghostData.z));
  g.rotation.set(0, lerp(ghostData.h), 0); // set ketiga sumbu, jangan hanya y
  g.visible = true;
}

const state = {
  pos: new THREE.Vector3(),
  heading: 0,
  speed: 0,
  steer: 0,
  idx: 0,
  lap: 1,
  cp1: false,
  cp2: false,
  running: false,
  raceStart: 0,
  lapStart: 0,
  laps: [] as number[],
};

function headingAt(i: number) {
  const t = tangents[i];
  return Math.atan2(-t.z, t.x);
}

function reset() {
  const i = N - 8; // sedikit di belakang garis start
  state.pos.copy(pts[i]);
  state.heading = headingAt(i);
  state.speed = 0;
  state.steer = 0;
  state.idx = i;
  state.lap = 1;
  state.cp1 = state.cp2 = false;
  state.laps = [];
  state.running = false;
  placeKart();
  snapCamera();
  updateHud(0);
}

/** Cari titik lintasan terdekat di sekitar indeks terakhir. */
function nearest(p: THREE.Vector3, from: number) {
  let best = from, bestD = Infinity;
  for (let k = -40; k <= 40; k++) {
    const i = (from + k + N) % N;
    const d = (pts[i].x - p.x) ** 2 + (pts[i].z - p.z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { i: best, dist: Math.sqrt(bestD) };
}

// ================= Input =================
const input = { gas: false, brake: false, left: false, right: false };
const KEYS: Record<string, keyof typeof input> = {
  KeyW: "gas", ArrowUp: "gas", KeyS: "brake", ArrowDown: "brake",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
};
addEventListener("keydown", (e) => { const k = KEYS[e.code]; if (k) { input[k] = true; e.preventDefault(); } });
addEventListener("keyup", (e) => { const k = KEYS[e.code]; if (k) input[k] = false; });
addEventListener("blur", () => Object.keys(input).forEach((k) => (input[k as keyof typeof input] = false)));

const touch = document.getElementById("touch")!;
let isTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
// cadangan: beberapa browser tidak melaporkan layar sentuh, jadi aktifkan saat ada sentuhan pertama
addEventListener("touchstart", () => { isTouch = true; document.body.classList.add("touch-mode"); if (state.running) touch.hidden = false; }, { passive: true });
if (isTouch) document.body.classList.add("touch-mode");
touch.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
  const k = b.dataset.key as keyof typeof input;
  const set = (v: boolean) => (e: PointerEvent) => { e.preventDefault(); input[k] = v; b.classList.toggle("is-down", v); };
  b.addEventListener("pointerdown", set(true));
  b.addEventListener("pointerup", set(false));
  b.addEventListener("pointercancel", set(false));
  b.addEventListener("pointerleave", set(false));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});

// ================= HUD =================
const $ = (id: string) => document.getElementById(id)!;
const hud = $("hud"), countdownEl = $("countdown"), warn = $("hud-warn");
const fmt = (ms: number) => {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), c = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
};
function readBest(): number | null {
  try { const v = Number(localStorage.getItem(`${BEST_KEY}-${carId}`)); return v > 0 ? v : null; } catch { return null; }
}
function saveBest(ms: number) {
  try { localStorage.setItem(`${BEST_KEY}-${carId}`, String(ms)); } catch { /* storage tidak tersedia */ }
}
function updateHud(now: number) {
  $("hud-lap").textContent = `${Math.min(state.lap, LAPS)}/${LAPS}`;
  $("hud-time").textContent = fmt(state.running ? now - state.raceStart : 0);
  const best = readBest();
  $("hud-best").textContent = best ? fmt(best) : "–";
  $("hud-speed").textContent = String(Math.round(Math.abs(state.speed) * 3.6));
}

// Minimap
const mm = $("minimap") as HTMLCanvasElement;
const mctx = mm.getContext("2d")!;
const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
const mmScale = Math.min((mm.width - 20) / (maxX - minX), (mm.height - 20) / (maxZ - minZ));
const mmX = (x: number) => 10 + (x - minX) * mmScale + (mm.width - 20 - (maxX - minX) * mmScale) / 2;
const mmY = (z: number) => 10 + (z - minZ) * mmScale + (mm.height - 20 - (maxZ - minZ) * mmScale) / 2;
function drawMinimap() {
  mctx.clearRect(0, 0, mm.width, mm.height);
  mctx.strokeStyle = "rgba(255,255,255,.75)";
  mctx.lineWidth = 3;
  mctx.beginPath();
  pts.forEach((p, i) => (i ? mctx.lineTo(mmX(p.x), mmY(p.z)) : mctx.moveTo(mmX(p.x), mmY(p.z))));
  mctx.closePath();
  mctx.stroke();
  const g = ghosts[carId];
  if (g?.visible) {
    mctx.fillStyle = "rgba(41,217,112,.45)"; // ghost
    mctx.beginPath();
    mctx.arc(mmX(g.position.x), mmY(g.position.z), 4, 0, Math.PI * 2);
    mctx.fill();
  }
  mctx.fillStyle = "#29D970";
  mctx.beginPath();
  mctx.arc(mmX(state.pos.x), mmY(state.pos.z), 5, 0, Math.PI * 2);
  mctx.fill();
}

// ================= Alur balapan =================
const screenStart = $("screen-start"), screenFinish = $("screen-finish");

function startCountdown() {
  screenStart.hidden = true;
  screenFinish.hidden = true;
  reset();
  ghostData = readGhost();
  ghostFor(carId, car.group);
  resetRecording();
  hud.hidden = false;
  touch.hidden = !isTouch;
  countdownEl.hidden = false;
  let n = 3;
  countdownEl.textContent = String(n);
  const tick = setInterval(() => {
    n--;
    if (n > 0) countdownEl.textContent = String(n);
    else if (n === 0) {
      countdownEl.textContent = "GO!";
      state.running = true;
      state.raceStart = state.lapStart = performance.now();
    } else {
      clearInterval(tick);
      countdownEl.hidden = true;
    }
  }, 800);
}

function finish(now: number) {
  state.running = false;
  const total = now - state.raceStart;
  const fastest = Math.min(...state.laps);
  const prev = readBest();
  const newBest = !prev || fastest < prev;
  if (newBest) saveBest(fastest);
  $("finish-total").textContent = fmt(total);
  $("finish-laps").innerHTML = state.laps
    .map((ms, i) => `<li class="${ms === fastest ? "best" : ""}">Lap ${i + 1} · ${fmt(ms)}</li>`)
    .join("");
  $("finish-note").textContent = newBest ? "New best lap on this device!" : `Your best lap: ${fmt(prev!)}`;
  touch.hidden = true;
  setTimeout(() => (screenFinish.hidden = false), 600);
}

// Pilih kendaraan di layar awal
const startBtn = $("btn-start") as HTMLButtonElement;
document.querySelectorAll<HTMLButtonElement>("[data-car]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    const id = btn.dataset.car as "kart" | "f1";
    document.querySelectorAll("[data-car]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    if (id === "f1" && !vehicles.f1) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading car…";
      try {
        vehicles.f1 = await f1Vehicle();
      } catch {
        startBtn.textContent = "Start Race";
        startBtn.disabled = false;
        document.querySelector<HTMLButtonElement>('[data-car="kart"]')!.click();
        $("car-error").hidden = false;
        return;
      }
      startBtn.textContent = "Start Race";
      startBtn.disabled = false;
    }
    scene.remove(car.group);
    if (ghosts[carId]) ghosts[carId]!.visible = false;
    carId = id;
    car = vehicles[id]!;
    scene.add(car.group);
    placeKart();
  }),
);
startBtn.addEventListener("click", startCountdown);
$("btn-retry").addEventListener("click", startCountdown);

// ================= Simulasi =================
const fwd = new THREE.Vector3();
function step(dt: number, now: number) {
  const control = state.running;
  const gas = control && input.gas, brake = control && input.brake;
  const steerIn = control ? (input.left ? 1 : 0) - (input.right ? 1 : 0) : 0;

  const near = nearest(state.pos, state.idx);
  const offTrack = near.dist > half + 0.8;
  const vmax = offTrack ? OFF_MAX_SPEED : MAX_SPEED;

  if (gas && state.speed < vmax) state.speed += ACCEL * dt;
  if (brake) state.speed -= (state.speed > 0 ? BRAKE : ACCEL * 0.5) * dt; // rem, lalu mundur pelan
  state.speed -= state.speed * DRAG * 0.1 * dt;
  if (!gas) state.speed -= state.speed * DRAG * dt;
  if (state.speed > vmax) state.speed -= 18 * dt; // rumput memperlambat
  state.speed = THREE.MathUtils.clamp(state.speed, -5, MAX_SPEED);
  if (!gas && !brake && Math.abs(state.speed) < 0.05) state.speed = 0;

  // kemudi: makin cepat makin responsif, sampai batas
  state.steer = THREE.MathUtils.lerp(state.steer, steerIn, Math.min(1, dt * 10));
  const grip = Math.min(1, Math.abs(state.speed) / 6);
  // heading naik = berbelok ke kiri (rotasi positif terhadap sumbu Y)
  state.heading += state.steer * STEER_RATE * grip * Math.sign(state.speed) * dt;

  fwd.set(Math.cos(state.heading), 0, -Math.sin(state.heading));
  state.pos.addScaledVector(fwd, state.speed * dt);

  // batas area: jangan terlalu jauh dari lintasan
  const after = nearest(state.pos, near.i);
  if (after.dist > half + 14) {
    const p = pts[after.i];
    state.pos.lerp(new THREE.Vector3(p.x, 0, p.z), 0.1);
    state.speed *= 0.9;
  }

  // lap: checkpoint 1/3 dan 2/3, lalu melewati garis start
  const prev = state.idx;
  state.idx = after.i;
  if (control) {
    if (state.idx > N * 0.3 && state.idx < N * 0.4) state.cp1 = true;
    if (state.idx > N * 0.63 && state.idx < N * 0.73) state.cp2 = true;
    if (prev > N * 0.9 && state.idx < N * 0.1 && state.cp1 && state.cp2) {
      const lapTime = now - state.lapStart;
      state.laps.push(lapTime);
      if (!ghostData || lapTime < ghostData.time) {
        saveGhost(lapTime);
        ghostData = readGhost();
      }
      resetRecording();
      state.lapStart = now;
      state.cp1 = state.cp2 = false;
      state.lap++;
      if (state.lap > LAPS) finish(now);
    }
  }
  // rekam posisi untuk ghost (20 Hz)
  if (state.running) {
    while (now - state.lapStart >= rec.next) {
      rec.x.push(state.pos.x); rec.z.push(state.pos.z); rec.h.push(state.heading);
      rec.next += GHOST_STEP;
    }
  }
  warn.hidden = !(control && offTrack);
}

function placeKart() {
  car.group.position.copy(state.pos);
  car.group.rotation.y = state.heading;
}

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function cameraTarget() {
  fwd.set(Math.cos(state.heading), 0, -Math.sin(state.heading));
  camPos.copy(state.pos).addScaledVector(fwd, -car.camBack).setY(car.camUp);
  camLook.copy(state.pos).addScaledVector(fwd, 3).setY(0.6);
}
function snapCamera() {
  cameraTarget();
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 75 : 62;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();
reset();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt, now);
  placeKart();
  car.animate(state.speed, state.steer, dt); // steer positif = kiri: roda & setir ikut ke kiri
  updateGhost(now);

  cameraTarget();
  camera.position.lerp(camPos, Math.min(1, dt * 5));
  camera.lookAt(camLook);
  sun.position.copy(state.pos).add(new THREE.Vector3(12, 20, 8));
  sun.target.position.copy(state.pos);

  updateHud(now);
  drawMinimap();
  renderer.render(scene, camera);
});

// Hanya saat development: akses untuk pengujian otomatis
if (import.meta.env.DEV) Object.assign(window, { __game: { state, pts, N, ghosts, camera, renderer, scene } });
