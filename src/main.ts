import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createKart } from "./kart";

// Hero: kart 3D yang terus berputar, bisa diputar manual dengan drag.
const canvas = document.getElementById("kart-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
camera.position.set(2.6, 1.5, 2.6);

scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a1f, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 5, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -2;
sun.shadow.camera.right = sun.shadow.camera.top = 2;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x29d970, 0.15);
rim.position.set(-3, 2, -3);
scene.add(rim);

// Lantai: lingkaran gelap + cincin hijau
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ color: 0x0c100d, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const ring = new THREE.Mesh(new THREE.RingGeometry(1.21, 1.25, 64), new THREE.MeshBasicMaterial({ color: 0x29d970 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(floor, ring);

const kart = createKart();
scene.add(kart.group);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.25, 0);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.6;
controls.maxPolarAngle = 1.45;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 2.2;

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // layar sempit: mundurkan kamera supaya kart tetap utuh
  camera.position.setLength(w < 500 ? 5.0 : 4.6);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

// Render hanya saat hero terlihat (hemat baterai)
let visible = true;
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

let firstFrame = true;
renderer.setAnimationLoop(() => {
  if (!visible) return;
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    dispatchEvent(new Event("anargya:scene-ready")); // memberi tahu loading screen
  }
});
