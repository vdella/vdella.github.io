import * as THREE from 'three';
import { PALETTE } from './world.js';

/**
 * Engine exhaust particles: a fixed pool of points recycled in a ring buffer.
 * Each particle stores its age; the shader fades and shrinks it over time.
 */
export class Trail {
  constructor(scene, size = 360) {
    this.size = size;
    this.cursor = 0;
    this.positions = new Float32Array(size * 3);
    this.velocities = new Float32Array(size * 3);
    this.life = new Float32Array(size); // 1 = just born, 0 = dead
    this.emitAccumulator = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uHot: { value: new THREE.Color(PALETTE.blue) },
        uCool: { value: new THREE.Color(PALETTE.green) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float aLife;
        varying float vLife;
        uniform float uPixelRatio;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (aLife * 90.0 + 8.0) * uPixelRatio / -mv.z;
          if (aLife <= 0.0) gl_PointSize = 0.0;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        uniform vec3 uHot;
        uniform vec3 uCool;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          vec3 color = mix(uCool, uHot, vLife);
          gl_FragColor = vec4(color, soft * vLife * 0.9);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.exhausts = [new THREE.Vector3(), new THREE.Vector3()];
  }

  update(dt, ship) {
    const rate = 40 + Math.abs(ship.throttle) * 120 + (ship.boosting ? 120 : 0);
    this.emitAccumulator += rate * dt;
    ship.exhaustPositions(this.exhausts);

    while (this.emitAccumulator >= 1) {
      this.emitAccumulator -= 1;
      const src = this.exhausts[this.cursor % 2];
      const i = this.cursor;
      this.positions[i * 3] = src.x + (Math.random() - 0.5) * 0.3;
      this.positions[i * 3 + 1] = src.y + (Math.random() - 0.5) * 0.3;
      this.positions[i * 3 + 2] = src.z + (Math.random() - 0.5) * 0.3;
      this.velocities[i * 3] = -ship.forward.x * 4 + (Math.random() - 0.5) * 1.5;
      this.velocities[i * 3 + 1] = 0.6 + Math.random();
      this.velocities[i * 3 + 2] = -ship.forward.z * 4 + (Math.random() - 0.5) * 1.5;
      this.life[i] = 1;
      this.cursor = (this.cursor + 1) % this.size;
    }

    const decay = dt * 1.6;
    for (let i = 0; i < this.size; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - decay);
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aLife.needsUpdate = true;
  }
}
