import * as THREE from 'three';
import { fbm, noise2, smoothstep, rng } from './noise.js';

/** GitHub dark ("Primer") colours. */
export const PALETTE = {
  canvas: '#0d1117',
  surface: '#161b22',
  overlay: '#21262d',
  border: '#30363d',
  borderStrong: '#484f58',
  fg: '#e6edf3',
  muted: '#8b949e',
  blue: '#58a6ff',
  blueDeep: '#1f6feb',
  blueDark: '#0d419d',
  green: '#3fb950',
  greenDeep: '#238636',
  purple: '#a371f7',
  // Contribution-graph levels, from "no activity" to "on fire".
  contrib: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  // Language dots, used for the pushable orbs.
  languages: ['#f34b7d', '#3572a5', '#00add8', '#3178c6', '#b07219'],
};

export const WORLD = {
  size: 460,          // terrain plane side length
  playRadius: 165,    // soft boundary for the ship
  lakeLevel: -4.2,    // water plane height
  padRadius: 10,      // flattened area around each zone
};

/**
 * Builds the planet surface and everything that sits on it.
 * Exposes heightAt(x, z) so other modules can follow the ground.
 */
export class World {
  constructor(scene, sections) {
    this.scene = scene;
    this.flatSpots = [
      { x: 0, z: 0, r: 12 }, // spawn
      ...sections.map((s) => ({ x: s.position[0], z: s.position[1], r: WORLD.padRadius + 4 })),
    ];
    this.time = 0;

    this.#buildTerrain();
    this.#buildLake();
    this.#buildBoundary();
    this.#buildTrees();
    this.#buildRocks();
    this.#buildCrystals();
    this.#buildClouds();
    this.#buildOrbs();
  }

  /** Analytic terrain height, shared by the mesh and the ship. */
  heightAt(x, z) {
    const dist = Math.hypot(x, z);
    let h = fbm(x * 0.011, z * 0.011, 5) * 16;
    h += noise2(x * 0.05, z * 0.05) * 1.2;

    // Mountains rise near the edge of the world: a natural wall.
    h += smoothstep(WORLD.playRadius - 10, WORLD.size * 0.5, dist) * 42;

    // Flatten landing pads and the spawn point.
    for (const spot of this.flatSpots) {
      const d = Math.hypot(x - spot.x, z - spot.z);
      const k = smoothstep(spot.r, spot.r + 16, d);
      h = h * k; // 0 at the pad centre, raw height far away
    }
    return h;
  }

  /** Ground height including the lake surface, used for hovering. */
  surfaceAt(x, z) {
    return Math.max(this.heightAt(x, z), WORLD.lakeLevel);
  }

  #buildTerrain() {
    const seg = 170;
    let geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)));
    }
    // Non-indexed so each triangle gets one flat colour (low-poly look).
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();

    // PlaneGeometry emits two consecutive triangles (6 vertices) per grid
    // cell, so colouring in steps of 6 paints whole squares: a 3D
    // contribution graph.
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const levels = PALETTE.contrib.map((hex) => new THREE.Color(hex));
    const rock = new THREE.Color(PALETTE.border);
    const peak = new THREE.Color(PALETTE.muted);
    const shore = new THREE.Color(PALETTE.overlay);
    const jitter = rng(7);

    for (let i = 0; i < p.count; i += 6) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 6; k++) {
        cx += p.getX(i + k);
        cy += p.getY(i + k);
        cz += p.getZ(i + k);
      }
      cx /= 6; cy /= 6; cz /= 6;

      if (cy > 22) c.copy(rock).lerp(peak, Math.min(1, (cy - 22) / 14));
      else if (cy > 12) c.copy(levels[0]).lerp(rock, (cy - 12) / 10);
      else if (cy < WORLD.lakeLevel + 0.6) c.copy(shore);
      else {
        // "Activity" field: broad regions plus per-cell variation.
        const activity =
          noise2(cx * 0.025 + 40, cz * 0.025 - 13) * 0.65 +
          noise2(cx * 0.35, cz * 0.35) * 0.35;
        const level = activity < -0.3 ? 0 : activity < -0.05 ? 1 : activity < 0.15 ? 2 : activity < 0.35 ? 3 : 4;
        c.copy(levels[level]);
      }

      c.offsetHSL(0, 0, (jitter() - 0.5) * 0.02);
      for (let k = 0; k < 6; k++) {
        colors[(i + k) * 3] = c.r;
        colors[(i + k) * 3 + 1] = c.g;
        colors[(i + k) * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.terrain = mesh;
  }

  #buildLake() {
    const geo = new THREE.CircleGeometry(WORLD.size * 0.42, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: PALETTE.blueDeep,
      emissive: PALETTE.blueDark,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.82,
      roughness: 0.25,
      metalness: 0.1,
    });
    const lake = new THREE.Mesh(geo, mat);
    lake.position.y = WORLD.lakeLevel;
    lake.receiveShadow = true;
    this.scene.add(lake);
    this.lake = lake;
  }

  #buildBoundary() {
    // Faint dashed ring that shows where the playable area ends.
    const segments = 96;
    const geo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < segments; i++) {
      if (i % 2) continue;
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      for (const a of [a0, a1]) {
        const x = Math.cos(a) * WORLD.playRadius;
        const z = Math.sin(a) * WORLD.playRadius;
        pts.push(x, this.surfaceAt(x, z) + 1.5, z);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.55 }),
    );
    this.scene.add(line);
  }

  /** Random spot that avoids pads, water and the mountain wall. */
  #scatter(random, minDist = 0, maxH = 14) {
    for (let tries = 0; tries < 40; tries++) {
      const a = random() * Math.PI * 2;
      const r = 14 + Math.sqrt(random()) * (WORLD.playRadius - 4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = this.heightAt(x, z);
      if (h < WORLD.lakeLevel + 0.8 || h > maxH) continue;
      if (this.flatSpots.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 6 + minDist)) continue;
      return { x, z, h };
    }
    return null;
  }

  #buildTrees() {
    const count = 240;
    const random = rng(42);
    const crownGeo = new THREE.ConeGeometry(1.8, 5, 6);
    crownGeo.translate(0, 4.2, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 2, 5);
    trunkGeo.translate(0, 1, 0);

    const crowns = new THREE.InstancedMesh(
      crownGeo,
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }),
      count,
    );
    const trunks = new THREE.InstancedMesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: PALETTE.borderStrong, flatShading: true }),
      count,
    );
    crowns.castShadow = trunks.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    const colorA = new THREE.Color(PALETTE.contrib[4]);
    const colorB = new THREE.Color(PALETTE.contrib[2]);
    const colorC = new THREE.Color(PALETTE.purple);
    const colorD = new THREE.Color(PALETTE.blue);
    const tmp = new THREE.Color();
    this.obstacles = [];

    let placed = 0;
    for (let i = 0; i < count; i++) {
      const spot = this.#scatter(random);
      if (!spot) continue;
      const scale = 0.7 + random() * 0.8;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI);
      s.set(scale, scale * (0.8 + random() * 0.5), scale);
      v.set(spot.x, spot.h - 0.2, spot.z);
      m.compose(v, q, s);
      crowns.setMatrixAt(placed, m);
      trunks.setMatrixAt(placed, m);
      // Mostly green, with the odd purple/blue tree.
      if (random() < 0.18) tmp.copy(colorC).lerp(colorD, random() * 0.6);
      else tmp.copy(colorA).lerp(colorB, random() * 0.6);
      crowns.setColorAt(placed, tmp);
      this.obstacles.push({ x: spot.x, z: spot.z, r: 1.4 * scale, top: spot.h + 6.5 * s.y });
      placed++;
    }
    crowns.count = trunks.count = placed;
    this.scene.add(crowns, trunks);
  }

  #buildRocks() {
    const count = 110;
    const random = rng(1337);
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }),
      count,
    );
    rocks.castShadow = rocks.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    const white = new THREE.Color(PALETTE.borderStrong);
    const pale = new THREE.Color(PALETTE.muted);
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const spot = this.#scatter(random, 0, 26);
      if (!spot) continue;
      const k = 0.6 + random() * 2.2;
      e.set(random() * 3, random() * 3, random() * 3);
      q.setFromEuler(e);
      s.set(k * (1 + random() * 0.6), k * (0.6 + random() * 0.5), k);
      v.set(spot.x, spot.h + k * 0.25, spot.z);
      m.compose(v, q, s);
      rocks.setMatrixAt(placed, m);
      rocks.setColorAt(placed, random() < 0.5 ? white : pale);
      if (k > 1.2) this.obstacles.push({ x: spot.x, z: spot.z, r: k * 1.1, top: spot.h + k });
      placed++;
    }
    rocks.count = placed;
    this.scene.add(rocks);
  }

  #buildCrystals() {
    const random = rng(99);
    this.crystals = [];
    const geo = new THREE.OctahedronGeometry(1.2, 0);
    geo.scale(0.7, 1.6, 0.7);
    const mats = [
      new THREE.MeshStandardMaterial({
        color: PALETTE.blue, emissive: PALETTE.blue, emissiveIntensity: 0.7, flatShading: true,
      }),
      new THREE.MeshStandardMaterial({
        color: PALETTE.green, emissive: PALETTE.green, emissiveIntensity: 0.7, flatShading: true,
      }),
    ];
    for (let i = 0; i < 26; i++) {
      const spot = this.#scatter(random, 2);
      if (!spot) continue;
      const mesh = new THREE.Mesh(geo, mats[i % 2]);
      mesh.castShadow = true;
      mesh.userData.baseY = spot.h + 2.6;
      mesh.userData.phase = random() * Math.PI * 2;
      mesh.position.set(spot.x, mesh.userData.baseY, spot.z);
      this.scene.add(mesh);
      this.crystals.push(mesh);
    }
  }

  #buildClouds() {
    const random = rng(2024);
    this.clouds = [];
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: PALETTE.overlay, flatShading: true, roughness: 1, transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 16; i++) {
      const group = new THREE.Group();
      const puffs = 3 + Math.floor(random() * 4);
      for (let j = 0; j < puffs; j++) {
        const puff = new THREE.Mesh(geo, mat);
        const k = 3 + random() * 4;
        puff.scale.set(k * 1.3, k * 0.8, k);
        puff.position.set((j - puffs / 2) * 4.5, random() * 2, (random() - 0.5) * 5);
        group.add(puff);
      }
      const a = random() * Math.PI * 2;
      const r = 30 + random() * 170;
      group.position.set(Math.cos(a) * r, 48 + random() * 22, Math.sin(a) * r);
      group.userData.speed = 1 + random() * 2;
      this.scene.add(group);
      this.clouds.push(group);
    }
  }

  /** Pushable orbs: purely for fun, they slide when the ship bumps them. */
  #buildOrbs() {
    const random = rng(5);
    this.orbs = [];
    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const colors = PALETTE.languages; // C++, Python, Go, TypeScript, Java
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + random() * 0.3;
      const r = 18 + random() * 22;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], flatShading: true, roughness: 0.5 }),
      );
      mesh.castShadow = true;
      mesh.position.set(x, this.surfaceAt(x, z) + 1.6, z);
      mesh.userData.vel = new THREE.Vector2();
      mesh.userData.radius = 1.6;
      this.scene.add(mesh);
      this.orbs.push(mesh);
    }
  }

  update(dt, ship) {
    this.time += dt;
    const t = this.time;

    for (const c of this.crystals) {
      c.rotation.y += dt * 0.8;
      c.position.y = c.userData.baseY + Math.sin(t * 1.6 + c.userData.phase) * 0.5;
    }

    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 230) cloud.position.x = -230;
    }

    // Orbs: circle-vs-circle push from the ship, then friction + bounds.
    for (const orb of this.orbs) {
      const vel = orb.userData.vel;
      const r = orb.userData.radius;
      const dx = orb.position.x - ship.position.x;
      const dz = orb.position.z - ship.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = r + ship.radius;
      const lowEnough = ship.position.y - orb.position.y < 3.2;
      if (dist < minDist && dist > 0.001 && lowEnough) {
        const nx = dx / dist;
        const nz = dz / dist;
        orb.position.x += nx * (minDist - dist);
        orb.position.z += nz * (minDist - dist);
        const push = Math.max(0, ship.velocity.x * nx + ship.velocity.z * nz);
        vel.x += nx * (push * 1.2 + 4);
        vel.y += nz * (push * 1.2 + 4);
      }
      orb.position.x += vel.x * dt;
      orb.position.z += vel.y * dt;
      vel.multiplyScalar(Math.exp(-1.4 * dt));

      const d = Math.hypot(orb.position.x, orb.position.z);
      if (d > WORLD.playRadius - 4) {
        orb.position.x *= (WORLD.playRadius - 4) / d;
        orb.position.z *= (WORLD.playRadius - 4) / d;
        vel.multiplyScalar(-0.5);
      }
      const ground = this.surfaceAt(orb.position.x, orb.position.z) + r;
      orb.position.y += (ground - orb.position.y) * Math.min(1, dt * 10);
      // Roll in the direction of travel.
      orb.rotation.x += (vel.y * dt) / r;
      orb.rotation.z -= (vel.x * dt) / r;
    }
  }
}
