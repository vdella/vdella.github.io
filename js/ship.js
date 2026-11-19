import * as THREE from 'three';
import { PALETTE, WORLD } from './world.js';

const HOVER_HEIGHT = 3.2;
const THRUST = 40;
const BOOST_THRUST = 78;
const DRAG = 1.55;
const LATERAL_GRIP = 3.5;
const TURN_SPEED = 2.3;

/**
 * An original low-poly hover-ship built from primitives.
 * The model faces -Z, the three.js convention for "forward".
 */
function buildModel() {
  const root = new THREE.Group();

  const body = new THREE.MeshStandardMaterial({ color: PALETTE.fg, roughness: 0.35, metalness: 0.15, flatShading: true });
  const accent = new THREE.MeshStandardMaterial({ color: PALETTE.blueDeep, roughness: 0.4, flatShading: true });
  const stripeMat = new THREE.MeshStandardMaterial({ color: PALETTE.greenDeep, roughness: 0.4, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.overlay, roughness: 0.6, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.blue, emissive: PALETTE.blue, emissiveIntensity: 0.5,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9,
  });

  // Fuselage: a lathe profile, rotated so its tip points forward (-Z).
  const profile = [
    [0, -2.6], [0.45, -2.2], [0.85, -1.2], [1.05, 0.2], [1.0, 1.4], [0.75, 2.1], [0, 2.2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fuselageGeo = new THREE.LatheGeometry(profile, 8);
  fuselageGeo.rotateX(-Math.PI / 2);
  fuselageGeo.scale(1, 0.62, 1);
  const fuselage = new THREE.Mesh(fuselageGeo, body);
  root.add(fuselage);

  // Green stripe along the spine.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 3.6), stripeMat);
  stripe.position.set(0, 0.62, 0.1);
  root.add(stripe);

  // Cockpit canopy.
  const canopyGeo = new THREE.SphereGeometry(0.62, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  canopyGeo.scale(1, 0.75, 1.7);
  const canopy = new THREE.Mesh(canopyGeo, glass);
  canopy.position.set(0, 0.35, -0.9);
  root.add(canopy);

  // Swept wings from an extruded 2D outline (x = span, y = length).
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.8);
  wingShape.lineTo(2.9, 0.9);
  wingShape.lineTo(3.0, 1.6);
  wingShape.lineTo(0, 1.4);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.14, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  for (const side of [1, -1]) {
    const wing = new THREE.Mesh(wingGeo, accent);
    wing.scale.x = side;
    wing.position.set(0.55 * side, 0, 0.2);
    wing.rotation.z = side * -0.08;
    root.add(wing);

    // Wingtip light pods.
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 6), glass);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(3.45 * side, -0.05, 1.4);
    root.add(pod);
  }

  // Tail fin.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.3, 0);
  finShape.lineTo(1.5, 1.15);
  finShape.lineTo(0.9, 1.15);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.12, bevelEnabled: false });
  finGeo.rotateY(-Math.PI / 2);
  const fin = new THREE.Mesh(finGeo, stripeMat);
  fin.position.set(0.06, 0.45, 0.6);
  root.add(fin);

  // Twin engines with glowing exhausts.
  const flames = [];
  const exhausts = [];
  const flameMat = new THREE.MeshBasicMaterial({
    color: PALETTE.blue, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: PALETTE.fg, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (const side of [1, -1]) {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.8, 8), dark);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(0.95 * side, -0.05, 1.6);
    root.add(nacelle);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.08, 6, 12), accent);
    ring.position.set(0.95 * side, -0.05, 2.5);
    root.add(ring);

    const flameGeo = new THREE.ConeGeometry(0.38, 1, 10, 1, true);
    flameGeo.translate(0, -0.5, 0);
    flameGeo.rotateX(-Math.PI / 2); // tip points backwards (+Z)
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0.95 * side, -0.05, 2.5);
    root.add(flame);
    flames.push(flame);

    const core = new THREE.Mesh(flameGeo, coreMat);
    core.scale.set(0.45, 0.45, 0.6);
    core.position.copy(flame.position);
    root.add(core);
    flames.push(core);

    exhausts.push(new THREE.Vector3(0.95 * side, -0.05, 2.7));
  }

  // Hover glow under the hull.
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 24),
    new THREE.MeshBasicMaterial({
      color: PALETTE.green, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.55;
  root.add(glow);

  root.traverse((o) => {
    if (o.isMesh && o.material !== flameMat && o.material !== coreMat && o !== glow) {
      o.castShadow = true;
    }
  });

  return { root, flames, exhausts, glow };
}

export class Ship {
  constructor(scene, world) {
    this.world = world;
    this.radius = 2.4;
    this.position = new THREE.Vector3(0, world.surfaceAt(0, 0) + HOVER_HEIGHT, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; // yaw 0 faces -Z, i.e. straight at the About pad
    this.yawVel = 0;
    this.roll = 0;
    this.pitch = 0;
    this.throttle = 0;
    this.boosting = false;
    this.onPad = false; // set by Zones each frame
    this.time = 0;

    const { root, flames, exhausts, glow } = buildModel();
    this.model = root;
    this.flames = flames;
    this.exhaustsLocal = exhausts;
    this.glow = glow;
    this.model.rotation.order = 'YXZ';
    scene.add(this.model);

    // Small light that tints the ground under the ship.
    this.light = new THREE.PointLight(PALETTE.blue, 18, 14, 2);
    this.light.position.set(0, -0.5, 2.6);
    this.model.add(this.light);

    this.forward = new THREE.Vector3(0, 0, -1);
    this.#syncModel();
  }

  reset() {
    this.position.set(0, this.world.surfaceAt(0, 0) + HOVER_HEIGHT, 0);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.yawVel = 0;
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** World-space positions of the two exhausts, for the particle trail. */
  exhaustPositions(out) {
    this.model.updateMatrixWorld();
    for (let i = 0; i < this.exhaustsLocal.length; i++) {
      out[i].copy(this.exhaustsLocal[i]).applyMatrix4(this.model.matrixWorld);
    }
    return out;
  }

  update(dt, input) {
    this.time += dt;
    const { steer, throttle, boost } = input;
    this.boosting = boost && throttle > 0;
    this.throttle += (throttle - this.throttle) * Math.min(1, dt * 6);

    // Yaw: turn a bit slower when going backwards, flip steer when reversing.
    const dir = throttle < 0 ? -1 : 1;
    const targetYawVel = -steer * TURN_SPEED * dir;
    this.yawVel += (targetYawVel - this.yawVel) * Math.min(1, dt * 7);
    this.yaw += this.yawVel * dt;

    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-this.forward.z, 0, this.forward.x);

    const thrust = (this.boosting ? BOOST_THRUST : THRUST) * throttle;
    this.velocity.addScaledVector(this.forward, thrust * dt);

    // Split velocity: drag along the nose, strong grip sideways (light drift).
    const fwdSpeed = this.velocity.dot(this.forward);
    const sideSpeed = this.velocity.dot(right);
    // Parking assist: extra drag on a landing pad when not accelerating.
    const drag = this.onPad && Math.abs(throttle) < 0.1 ? DRAG * 3 : DRAG;
    const fwdDamped = fwdSpeed * Math.exp(-drag * dt);
    const sideDamped = sideSpeed * Math.exp(-LATERAL_GRIP * dt);
    this.velocity.set(0, 0, 0)
      .addScaledVector(this.forward, fwdDamped)
      .addScaledVector(right, sideDamped);

    this.position.addScaledVector(this.velocity, dt);

    // Soft world boundary: steer back toward the centre.
    const d = Math.hypot(this.position.x, this.position.z);
    if (d > WORLD.playRadius) {
      const nx = this.position.x / d;
      const nz = this.position.z / d;
      const over = d - WORLD.playRadius;
      this.position.x -= nx * over * Math.min(1, dt * 8);
      this.position.z -= nz * over * Math.min(1, dt * 8);
      const out = this.velocity.x * nx + this.velocity.z * nz;
      if (out > 0) {
        this.velocity.x -= nx * out * 1.6;
        this.velocity.z -= nz * out * 1.6;
      }
    }

    // Bump into trees and big rocks when flying low.
    for (const o of this.world.obstacles) {
      const dx = this.position.x - o.x;
      const dz = this.position.z - o.z;
      if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
      if (this.position.y - 0.6 > o.top) continue;
      const dist = Math.hypot(dx, dz);
      const min = o.r + this.radius * 0.7;
      if (dist < min && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        this.position.x += nx * (min - dist);
        this.position.z += nz * (min - dist);
        const into = this.velocity.x * nx + this.velocity.z * nz;
        if (into < 0) {
          this.velocity.x -= nx * into * 1.5;
          this.velocity.z -= nz * into * 1.5;
        }
      }
    }

    // Hover: follow the highest ground under and slightly ahead of the ship.
    const ahead = this.position.clone().addScaledVector(this.forward, 3);
    const groundHere = this.world.surfaceAt(this.position.x, this.position.z);
    const groundAhead = this.world.surfaceAt(ahead.x, ahead.z);
    const ground = Math.max(groundHere, groundAhead * 0.85 + groundHere * 0.15);
    const bob = Math.sin(this.time * 2.2) * 0.22;
    const targetY = ground + HOVER_HEIGHT + bob;
    this.position.y += (targetY - this.position.y) * Math.min(1, dt * 6);
    this.position.y = Math.max(this.position.y, groundHere + 1.4);

    // Cosmetic attitude: bank into turns, pitch with slope and acceleration.
    const slope = (groundAhead - groundHere) / 3;
    const targetRoll = this.yawVel * 0.38 + (sideSpeed / 30);
    const targetPitch = Math.atan(slope) * 0.6 - this.throttle * 0.06;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 5);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 5);

    this.#syncModel();
    this.#updateFlames();
  }

  #syncModel() {
    this.model.position.copy(this.position);
    this.model.rotation.set(this.pitch, this.yaw, this.roll);
  }

  #updateFlames() {
    const power = Math.max(0.15, Math.abs(this.throttle)) * (this.boosting ? 1.9 : 1);
    const flicker = 0.85 + Math.random() * 0.3;
    for (const f of this.flames) {
      const base = f.userData.base ?? (f.userData.base = f.scale.clone());
      f.scale.set(base.x, base.y, base.z * (0.6 + power * 1.8) * flicker);
    }
    this.glow.material.opacity = 0.35 + Math.sin(this.time * 6) * 0.08;
    this.light.intensity = 10 + power * 14;
  }
}
