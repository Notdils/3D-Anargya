import * as THREE from "three";

// Model low-poly kart listrik Anargya, dibuat dari foto di sirkuit ITS.
// Satuan: meter. Depan kart = sumbu +X, atas = +Y, kanan kart = +Z, kiri kart = -Z
// (sistem koordinat tangan kanan Three.js: X × Y = Z).
// Ukuran memakai patokan kart standar (belum diukur langsung).

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, flatShading: true, ...opts });

const C = {
  orange: mat(0xf26a1b),
  black: mat(0x15171a, { roughness: 0.35 }),
  white: mat(0xf2f2ee),
  steel: mat(0xb9bec4, { metalness: 0.7, roughness: 0.35 }),
  alu: mat(0xc9ccce, { metalness: 0.55, roughness: 0.45 }),
  tire: mat(0x1c1c1c, { roughness: 0.9 }),
  rim: mat(0x8d9399, { metalness: 0.6, roughness: 0.4 }),
  red: mat(0xb3262b),
  green: mat(0x37e05a, { roughness: 0.5 }),
  screen: mat(0x2a3a33, { emissive: 0x29d970, emissiveIntensity: 0.25 }),
  blue: mat(0x1d4f9c),
};

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Profil samping diekstrusi sepanjang Z (untuk side pod, nose). */
function extrude(points: [number, number][], depth: number, m: THREE.Material) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, m);
}

function wheel(radius: number, width: number) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), C.tire);
  tire.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.01, 10), C.rim);
  rim.rotation.x = Math.PI / 2;
  g.add(tire, rim);
  return g;
}

export type Kart = {
  group: THREE.Group;
  /** roda depan (bisa dibelokkan) dan semua roda (bisa diputar) */
  frontPivots: THREE.Group[];
  wheels: THREE.Group[];
  steering: THREE.Group;
};

export function createKart(): Kart {
  const g = new THREE.Group();

  // ---- Roda ----
  const wheels: THREE.Group[] = [];
  const frontPivots: THREE.Group[] = [];
  const RF = 0.13, RR = 0.14;
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.52, RF, side * 0.56);
    const wf = wheel(RF, 0.13);
    pivot.add(wf);
    g.add(pivot);
    frontPivots.push(pivot);
    wheels.push(wf);

    const wr = wheel(RR, 0.2);
    wr.position.set(-0.52, RR, side * 0.6);
    g.add(wr);
    wheels.push(wr);
  }

  // ---- Rangka (pipa baja) ----
  const y0 = 0.07;
  const frame: [number, number, number, number, number, number][] = [
    [0.62, y0, 0.22, -0.6, y0, 0.22],
    [0.62, y0, -0.22, -0.6, y0, -0.22],
    [0.52, y0, 0.5, 0.52, y0, -0.5], // poros depan
    [-0.52, RR, 0.62, -0.52, RR, -0.62], // as belakang
    [0.62, y0, 0.22, 0.82, 0.12, 0.2], // bumper depan
    [0.62, y0, -0.22, 0.82, 0.12, -0.2],
  ];
  for (const f of frame) g.add(tube(new THREE.Vector3(f[0], f[1], f[2]), new THREE.Vector3(f[3], f[4], f[5]), 0.014, C.steel));

  // ---- Side pod kiri & kanan: oranye bawah, garis putih, hitam atas ----
  for (const side of [1, -1]) {
    const pod = new THREE.Group();
    const orange = extrude([[-0.38, 0.06], [0.36, 0.06], [0.4, 0.12], [0.4, 0.16], [-0.42, 0.16], [-0.42, 0.1]], 0.16, C.orange);
    const white = extrude([[-0.42, 0.16], [0.4, 0.16], [0.4, 0.18], [0.05, 0.18], [-0.05, 0.21], [-0.42, 0.21]], 0.165, C.white);
    const black = extrude([[-0.42, 0.21], [-0.05, 0.21], [0.05, 0.18], [0.4, 0.18], [0.38, 0.27], [-0.4, 0.27]], 0.17, C.black);
    pod.add(orange, white, black);
    pod.position.set(0.02, 0, side * 0.6);
    g.add(pod);
  }

  // ---- Nose depan ----
  const nose = new THREE.Group();
  nose.add(extrude([[0.0, 0.05], [0.26, 0.05], [0.3, 0.1], [0.26, 0.17], [0.05, 0.15], [0.0, 0.1]], 0.72, C.orange));
  nose.add(extrude([[0.26, 0.05], [0.3, 0.1], [0.32, 0.08], [0.29, 0.04]], 0.74, C.black));
  nose.add(box(0.03, 0.02, 0.72, C.white, 0.2, 0.16, 0));
  nose.position.set(0.62, 0, 0);
  g.add(nose);

  // ---- Panel depan (steering cowl), hitam melengkung ke atas ----
  const cowl = extrude([[0.0, 0.0], [0.05, 0.0], [0.52, 0.2], [0.5, 0.26], [0.36, 0.24], [0.0, 0.05]], 0.22, C.black);
  cowl.position.set(0.36, 0.14, 0);
  g.add(cowl);

  // ---- Kemudi: kolom, setir merah, layar ----
  // column = kemiringan setir (tetap), steering = bagian yang berputar saat belok
  const column = new THREE.Group();
  const steering = new THREE.Group();
  const colA = new THREE.Vector3(0.48, 0.12, 0), colB = new THREE.Vector3(0.22, 0.5, 0);
  g.add(tube(colA, colB, 0.014, C.steel));
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 16), C.red);
  const hub = box(0.02, 0.06, 0.2, C.steel);
  const screen = box(0.03, 0.06, 0.09, C.screen, -0.005, 0.07, 0);
  const estop = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8), C.red);
  estop.rotation.z = Math.PI / 2;
  estop.position.set(-0.02, -0.03, 0.05);
  wheelRim.rotation.y = Math.PI / 2;
  steering.add(wheelRim, hub, screen, estop);
  column.add(steering);
  column.position.copy(colB);
  column.rotation.z = -0.95; // condong ke arah pengemudi
  g.add(column);

  // ---- Kursi ----
  const seat = extrude([[-0.2, 0.08], [0.14, 0.08], [0.18, 0.16], [0.0, 0.14], [-0.18, 0.42], [-0.24, 0.4]], 0.34, C.black);
  seat.position.set(-0.12, 0, 0);
  g.add(seat);

  // ---- Kotak aluminium (sisi kiri = -Z, sejajar kursi) ----
  g.add(box(0.46, 0.16, 0.14, C.alu, -0.08, 0.2, -0.3));

  // ---- Kotak putih "elektro-ITS" + tombol darurat merah (belakang tengah) ----
  const eBox = box(0.24, 0.12, 0.3, C.white, -0.47, 0.25, 0.05);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), C.blue);
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(-0.47, 0.312, 0.08);
  const estopBig = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 10), C.red);
  estopBig.position.set(-0.4, 0.33, -0.05);
  g.add(eBox, logo, estopBig);

  // ---- Radiator + selang hijau (belakang kanan = +Z) ----
  const rad = box(0.05, 0.22, 0.18, C.steel, -0.46, 0.4, 0.3);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), C.black);
  fan.rotation.z = Math.PI / 2;
  fan.position.set(-0.49, 0.4, 0.3);
  const capRed = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), C.red);
  capRed.position.set(-0.46, 0.52, 0.38);
  g.add(rad, fan, capRed);
  const hose = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.44, 0.48, 0.22),
    new THREE.Vector3(-0.36, 0.42, 0.12),
    new THREE.Vector3(-0.42, 0.2, 0.1),
    new THREE.Vector3(-0.52, 0.12, 0.22),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(hose, 16, 0.012, 5), C.green));

  // ---- Motor & cakram rem di as belakang ----
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10), C.steel);
  motor.rotation.x = Math.PI / 2;
  motor.position.set(-0.4, 0.14, 0.3);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14), C.rim);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(-0.52, RR, -0.28);
  g.add(motor, disc);

  // ---- Bumper belakang hitam ----
  g.add(box(0.1, 0.12, 1.36, C.black, -0.78, 0.17, 0));
  for (const z of [0.4, -0.4]) g.add(box(0.2, 0.06, 0.06, C.black, -0.68, 0.15, z));
  const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), C.green);
  sticker.rotation.y = -Math.PI / 2;
  sticker.position.set(-0.831, 0.18, 0.15);
  g.add(sticker);

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { group: g, frontPivots, wheels, steering };
}
