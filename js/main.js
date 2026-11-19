import * as THREE from 'three';
import { SECTIONS } from './content.js';
import { World, PALETTE } from './world.js';
import { Ship } from './ship.js';
import { Zones } from './zones.js';
import { Trail } from './trail.js';
import { Input } from './input.js';
import { UI } from './ui.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Static star field on a large sphere; ignores fog so it stays visible. */
function makeStars() {
  const count = 1400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const y = Math.abs(u) * 0.9 + 0.05; // upper hemisphere only
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 480;
    pos[i * 3 + 1] = y * 480;
    pos[i * 3 + 2] = Math.sin(a) * r * 480;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: PALETTE.fg, size: 1.6, sizeAttenuation: false, fog: false }),
  );
  return stars;
}

async function start() {
  const input = new Input();
  const ui = new UI(input);

  if (!webglAvailable()) {
    ui.fallback();
    return;
  }

  // Labels are drawn on canvases, so wait for the web font first.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

  const isTouch = matchMedia('(pointer: coarse)').matches;
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const sky = new THREE.Color(PALETTE.canvas);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 80, 280);
  scene.add(makeStars());

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 700);

  // Lighting: cool night sky / green bounce, plus a moon that casts shadows.
  scene.add(new THREE.HemisphereLight('#c9d1d9', PALETTE.contrib[1], 1.5));
  const sun = new THREE.DirectionalLight('#cae8ff', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -55;
  sc.right = sc.top = 55;
  sc.near = 1;
  sc.far = 220;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  const world = new World(scene, SECTIONS);
  const zones = new Zones(scene, world, SECTIONS);
  const ship = new Ship(scene, world);
  const trail = new Trail(scene);
  ui.onReset = () => ship.reset();

  // Camera rig: chase cam behind the ship, eased toward its target.
  const camOffset = new THREE.Vector3(0, 8.5, 17);
  const camTarget = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const desired = new THREE.Vector3();
  function placeCamera(dt, snap = false) {
    desired.copy(camOffset).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ship.yaw);
    // Pull back a little at speed for a sense of velocity.
    desired.multiplyScalar(1 + ship.speed * 0.006).add(ship.position);
    const minY = world.surfaceAt(desired.x, desired.z) + 3;
    desired.y = Math.max(desired.y, minY);
    const k = snap ? 1 : 1 - Math.exp(-4 * dt);
    camera.position.lerp(desired, k);
    camTarget.copy(ship.position).addScaledVector(ship.forward, 6);
    camTarget.y += 1.5;
    lookAt.lerp(camTarget, snap ? 1 : 1 - Math.exp(-8 * dt));
    camera.lookAt(lookAt);
  }
  placeCamera(0, true);

  // Intro: slow orbit around the spawn until the visitor launches.
  let launched = false;
  ui.ready(() => {
    launched = true;
    document.getElementById('hint').classList.add('visible');
    setTimeout(() => document.getElementById('hint').classList.remove('visible'), 7000);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const timer = new THREE.Timer();
  let introAngle = 0;
  let mapTimer = 0;

  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 1 / 20);

    const controls = launched ? input.read() : { steer: 0, throttle: 0, boost: false };
    ship.update(dt, controls);
    world.update(dt, ship);
    trail.update(dt, ship);
    const active = zones.update(dt, ship);

    if (launched) {
      ui.setActive(active);
      placeCamera(dt);
    } else {
      introAngle += dt * 0.15;
      camera.position.set(Math.sin(introAngle) * 38, 22, Math.cos(introAngle) * 38);
      camera.lookAt(ship.position);
      lookAt.copy(ship.position);
    }

    // Keep the shadow frustum centred on the ship.
    sun.position.copy(ship.position).add(new THREE.Vector3(40, 70, 25));
    sun.target.position.copy(ship.position);

    mapTimer += dt;
    if (mapTimer > 1 / 20) {
      mapTimer = 0;
      ui.drawMinimap(ship, SECTIONS);
      ui.setSpeed(ship.speed);
    }

    renderer.render(scene, camera);
  });
}

start();
