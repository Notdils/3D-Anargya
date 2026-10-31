import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createKart } from "./kart";

/** Kendaraan yang bisa dipakai di game. Depan = +X, kiri = -Z (sama seperti kart). */
export type Vehicle = {
  group: THREE.Group;
  /** steer positif = kiri */
  animate(speed: number, steer: number, dt: number): void;
  /** jarak kamera di belakang & tinggi kamera */
  camBack: number;
  camUp: number;
};

export function kartVehicle(): Vehicle {
  const kart = createKart();
  kart.group.scale.setScalar(1.15);
  return {
    group: kart.group,
    camBack: 5.2,
    camUp: 2.4,
    animate(speed, steer, dt) {
      for (const p of kart.frontPivots) p.rotation.y = steer * 0.35;
      kart.steering.rotation.x = -steer * 1.2;
      for (const w of kart.wheels) w.rotation.z -= (speed / 0.14) * dt;
    },
  };
}

// Mobil F1 dari file 3D pihak ketiga. Livery sudah diganti warna Anargya (tanpa logo merek),
// tekstur & geometri dikompres (±1,6 MB). Lihat README.
const F1_URL = "/models/f1.glb";
const F1_SCALE = 0.6; // model asli ±4,4 m, dikecilkan supaya pas dengan lebar lintasan

export async function f1Vehicle(): Promise<Vehicle> {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(F1_URL);
  const model = gltf.scene;
  model.rotation.y = Math.PI / 2; // depan model = +Z, putar jadi +X
  model.scale.setScalar(F1_SCALE);
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  const group = new THREE.Group();
  group.add(model);

  // Roda depan & belakang masing-masing satu objek per pasang (tidak bisa dibelokkan per roda)
  const wheels = ["front_wheels", "back_wheels"].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
  const wheelR = 0.31 * F1_SCALE;
  const sw = model.getObjectByName("steering_wheel");
  const swBase = sw?.quaternion.clone();
  const qz = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);

  return {
    group,
    camBack: 6.4,
    camUp: 2.6,
    animate(speed, steer, dt) {
      for (const w of wheels) w.rotation.x += (speed / wheelR) * dt;
      if (sw && swBase) sw.quaternion.copy(swBase).multiply(qz.setFromAxisAngle(zAxis, -steer * 1.2));
    },
  };
}
