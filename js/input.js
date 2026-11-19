/**
 * Keyboard + touch input, normalised to { steer, throttle, boost }.
 * steer: -1 (left) .. 1 (right), throttle: -1 (reverse) .. 1 (forward).
 */
export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.touchBoost = false;
    this.listeners = {};
    this.enabled = true;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) this.#emit(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    this.#setupJoystick();
  }

  /** Subscribe to a one-shot key press, e.g. on('e', fn). */
  on(key, fn) {
    (this.listeners[key] ??= []).push(fn);
  }

  #emit(key) {
    for (const fn of this.listeners[key] ?? []) fn();
  }

  #setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    const boost = document.getElementById('boost-button');
    if (!zone) return;
    const max = 46;

    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.touch = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
      base.style.left = `${e.clientX}px`;
      base.style.top = `${e.clientY}px`;
      base.classList.add('visible');
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.touch.active || e.pointerId !== this.touch.id) return;
      let dx = e.clientX - this.touch.ox;
      let dy = e.clientY - this.touch.oy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.touch.dx = dx / max;
      this.touch.dy = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== this.touch.id) return;
      this.touch.active = false;
      this.touch.dx = this.touch.dy = 0;
      knob.style.transform = '';
      base.classList.remove('visible');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    boost.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.touchBoost = true;
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      boost.addEventListener(ev, () => (this.touchBoost = false));
    }
  }

  read() {
    if (!this.enabled) return { steer: 0, throttle: 0, boost: false };
    const k = this.keys;
    let steer = 0;
    let throttle = 0;
    if (k.has('a') || k.has('arrowleft')) steer -= 1;
    if (k.has('d') || k.has('arrowright')) steer += 1;
    if (k.has('w') || k.has('arrowup')) throttle += 1;
    if (k.has('s') || k.has('arrowdown')) throttle -= 1;
    let boost = k.has('shift') || k.has(' ');

    if (this.touch.active) {
      steer = this.touch.dx;
      throttle = -this.touch.dy;
    }
    if (this.touchBoost) {
      boost = true;
      if (!this.touch.active) throttle = 1;
    }
    return { steer, throttle, boost };
  }

  get anyPressed() {
    return this.keys.size > 0 || this.touch.active || this.touchBoost;
  }
}
