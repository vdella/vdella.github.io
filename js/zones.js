import * as THREE from 'three';
import { PALETTE, WORLD } from './world.js';

const TRIGGER_RADIUS = WORLD.padRadius + 1.5;

const SANS = '"Mona Sans", -apple-system, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

/** Draws a repository-card style label on a canvas and returns it as a sprite. */
function makeLabel(id, kicker, accent) {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = 512 * scale;
  canvas.height = 200 * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Card
  ctx.fillStyle = PALETTE.surface;
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(16, 20, 480, 150, 18);
  ctx.fill();
  ctx.stroke();
  // Accent bar on the left edge
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(16, 20, 12, 150, [18, 0, 0, 18]);
  ctx.fill();

  // "vdella / section" like a repository name
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 46px ${SANS}`;
  const owner = 'vdella / ';
  const ownerW = ctx.measureText(owner).width;
  ctx.font = `700 46px ${SANS}`;
  const repoW = ctx.measureText(id).width;
  let x = 256 - (ownerW + repoW) / 2;
  ctx.font = `400 46px ${SANS}`;
  ctx.fillStyle = PALETTE.blue;
  ctx.fillText(owner, x, 92);
  ctx.font = `700 46px ${SANS}`;
  ctx.fillText(id, x + ownerW, 92);

  // Kicker in monospace, muted
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 26px ${MONO}`;
  ctx.fillText(`# ${kicker.toLowerCase()}`, 256, 140);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set(14, 14 * (200 / 512), 1);
  return sprite;
}

/**
 * One hexagonal landing pad per CV section, with a beacon visible from
 * far away and a floating label. Tracks which pad the ship is parked on.
 */
export class Zones {
  constructor(scene, world, sections) {
    this.zones = [];
    this.active = null;
    this.time = 0;

    const padGeo = new THREE.CylinderGeometry(WORLD.padRadius, WORLD.padRadius + 0.6, 0.8, 6);
    const rimGeo = new THREE.CylinderGeometry(WORLD.padRadius + 0.65, WORLD.padRadius + 0.65, 0.3, 6, 1, true);
    const ringGeo = new THREE.RingGeometry(WORLD.padRadius - 1.6, WORLD.padRadius - 0.9, 6);
    ringGeo.rotateX(-Math.PI / 2);
    const beaconGeo = new THREE.CylinderGeometry(0.5, 1.4, 60, 12, 1, true);
    beaconGeo.translate(0, 30, 0);

    for (const section of sections) {
      const [x, z] = section.position;
      const accent = section.accent === 'green' ? PALETTE.green : PALETTE.blue;
      const y = world.heightAt(x, z);
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const pad = new THREE.Mesh(
        padGeo,
        new THREE.MeshStandardMaterial({ color: PALETTE.surface, roughness: 0.6, flatShading: true }),
      );
      pad.position.y = 0.2;
      pad.receiveShadow = true;
      group.add(pad);

      const rim = new THREE.Mesh(
        rimGeo,
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, side: THREE.DoubleSide }),
      );
      rim.position.y = 0.5;
      group.add(rim);

      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.6,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      ring.position.y = 0.65;
      group.add(ring);

      const beacon = new THREE.Mesh(
        beaconGeo,
        new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        }),
      );
      group.add(beacon);

      const label = makeLabel(section.id, section.kicker, accent);
      label.position.y = 11;
      group.add(label);

      scene.add(group);
      this.zones.push({ section, group, ring, beacon, label, x, z });
    }
  }

  /** Returns the section the ship is currently inside, or null. */
  update(dt, ship) {
    this.time += dt;
    let found = null;
    for (const zone of this.zones) {
      const d = Math.hypot(ship.position.x - zone.x, ship.position.z - zone.z);
      const inside = d < TRIGGER_RADIUS;
      if (inside) found = zone;

      const pulse = 1 + Math.sin(this.time * 3 + zone.x) * 0.04;
      const target = inside ? 1.12 : 1;
      const s = zone.ring.scale.x + (target * pulse - zone.ring.scale.x) * Math.min(1, dt * 6);
      zone.ring.scale.set(s, 1, s);
      zone.ring.material.opacity = inside ? 0.95 : 0.55;
      zone.beacon.material.opacity = inside ? 0.32 : 0.16 + Math.sin(this.time * 2 + zone.z) * 0.03;
      zone.label.position.y = 11 + Math.sin(this.time * 1.5 + zone.x) * 0.4;
    }
    ship.onPad = !!found;
    this.active = found ? found.section : null;
    return this.active;
  }
}
