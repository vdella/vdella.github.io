import { PROFILE, SECTIONS } from './content.js';
import { PALETTE, WORLD } from './world.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Renders one content block (see content.js) to HTML. */
function renderBlock(block) {
  switch (block.type) {
    case 'text':
      return `<p class="lead">${esc(block.body)}</p>`;
    case 'facts':
      return `<dl class="facts">${block.items
        .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
        .join('')}</dl>`;
    case 'cards':
      return `<div class="cards">${block.items
        .map(
          (c) => `
        <article class="card">
          <h3>${esc(c.title)}</h3>
          <p class="sub">${esc(c.subtitle)}</p>
          <p>${esc(c.body)}</p>
          <ul class="tags">${c.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          ${c.link ? `<a class="more" href="${esc(c.link)}" target="_blank" rel="noopener">View code →</a>` : ''}
        </article>`,
        )
        .join('')}</div>`;
    case 'timeline':
      return `<ol class="timeline">${block.items
        .map(
          (t) => `
        <li>
          <span class="when">${esc(t.when)}</span>
          <h3>${esc(t.title)}</h3>
          <p class="sub">${esc(t.where)}</p>
          <ul>${t.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        </li>`,
        )
        .join('')}</ol>`;
    case 'groups':
      return `<div class="groups">${block.items
        .map(
          ([name, items]) => `
        <section><h3>${esc(name)}</h3>
          <ul class="tags">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </section>`,
        )
        .join('')}</div>`;
    case 'links':
      return `<div class="links">${PROFILE.links
        .map((l, i) => `<a class="btn${i === 0 ? ' primary' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
        .join('')}</div>`;
    default:
      return '';
  }
}

export function renderSection(section) {
  return `
    <p class="kicker">${esc(section.kicker)}</p>
    <h2>${esc(section.title)}</h2>
    ${section.blocks.map(renderBlock).join('')}`;
}

/** All DOM overlays: loader, prompt, panel, minimap, HUD and classic mode. */
export class UI {
  constructor(input) {
    this.input = input;
    this.$ = (id) => document.getElementById(id);
    this.panelOpen = false;
    this.classicOpen = false;
    this.current = null;
    this.onReset = () => {};

    this.$('name').textContent = PROFILE.name;
    this.$('headline').textContent = PROFILE.headline;

    this.$('prompt').addEventListener('click', () => this.openPanel());
    this.$('panel-close').addEventListener('click', () => this.closePanel());
    this.$('panel-backdrop').addEventListener('click', () => this.closePanel());
    this.$('classic-toggle').addEventListener('click', () => this.toggleClassic());
    this.$('classic-close').addEventListener('click', () => this.toggleClassic(false));
    this.$('reset-button').addEventListener('click', () => this.onReset());

    input.on('e', () => this.openPanel());
    input.on('enter', () => this.openPanel());
    input.on('escape', () => {
      if (this.panelOpen) this.closePanel();
      else if (this.classicOpen) this.toggleClassic(false);
    });
    input.on('r', () => !this.panelOpen && this.onReset());

    this.#renderClassic();
    this.minimap = this.$('minimap').getContext('2d');
  }

  ready(onLaunch) {
    const btn = this.$('launch');
    btn.disabled = false;
    btn.textContent = 'Launch';
    btn.addEventListener('click', () => {
      this.$('loader').classList.add('hidden');
      document.body.classList.add('playing');
      onLaunch();
    }, { once: true });
  }

  /** Called every frame with the section under the ship (or null). */
  setActive(section) {
    if (section === this.current) return;
    this.current = section;
    const prompt = this.$('prompt');
    if (section) {
      const touch = matchMedia('(pointer: coarse)').matches;
      prompt.innerHTML = `<span class="dot"></span> ${touch ? 'Tap' : 'Press <kbd>E</kbd>'} to open <strong>${esc(section.title)}</strong>`;
      prompt.classList.add('visible');
    } else {
      prompt.classList.remove('visible');
    }
  }

  openPanel() {
    if (!this.current || this.panelOpen || this.classicOpen) return;
    this.$('panel-body').innerHTML = renderSection(this.current);
    this.$('panel').dataset.accent = this.current.accent;
    document.body.classList.add('panel-open');
    this.panelOpen = true;
    this.input.enabled = false;
    this.$('panel-close').focus();
  }

  closePanel() {
    document.body.classList.remove('panel-open');
    this.panelOpen = false;
    this.input.enabled = true;
  }

  toggleClassic(force) {
    this.classicOpen = force ?? !this.classicOpen;
    document.body.classList.toggle('classic-open', this.classicOpen);
    this.input.enabled = !this.classicOpen && !this.panelOpen;
    this.$('classic-toggle').textContent = this.classicOpen ? 'Back to the planet' : 'Classic CV';
  }

  /** WebGL unavailable: show the classic page permanently. */
  fallback() {
    this.$('loader').classList.add('hidden');
    document.body.classList.add('no-webgl');
    this.toggleClassic(true);
  }

  #renderClassic() {
    const header = `
      <header class="classic-header">
        <h1>${esc(PROFILE.name)}</h1>
        <p>${esc(PROFILE.headline)}</p>
        <p class="sub">${esc(PROFILE.location)}</p>
      </header>`;
    const body = SECTIONS.map((s) => `<section class="classic-section">${renderSection(s)}</section>`).join('');
    this.$('classic-body').innerHTML = header + body;
  }

  setSpeed(speed) {
    this.$('speed').textContent = Math.round(speed * 3.6).toString().padStart(3, '0');
  }

  drawMinimap(ship, sections) {
    const ctx = this.minimap;
    const size = ctx.canvas.width;
    const half = size / 2;
    const scale = (half - 8) / WORLD.playRadius;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '700 11px "Mona Sans", -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of sections) {
      const x = half + s.position[0] * scale;
      const y = half + s.position[1] * scale;
      const active = this.current === s;
      ctx.fillStyle = s.accent === 'green' ? PALETTE.greenDeep : PALETTE.blueDeep;
      ctx.beginPath();
      ctx.arc(x, y, active ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.fg;
      ctx.fillText(s.title[0], x, y + 0.5);
    }

    // Ship arrow. yaw 0 points to -Z, which is "up" on the map.
    const sx = half + ship.position.x * scale;
    const sy = half + ship.position.z * scale;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-ship.yaw);
    ctx.fillStyle = PALETTE.fg;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
