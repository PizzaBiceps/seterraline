type Particle = { x: number; y: number; vx: number; vy: number; size: number; life: number; duration: number; color: string };
export type BurstKind = 'click' | 'correct' | 'wrong' | 'complete' | 'fire' | 'ink' | 'water';

/** Pixel particles use a separate overlay; the map remains rendered on demand. */
export class ClickEffects {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private frame = 0;
  private previous = 0;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private enabled = true;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'particle-layer';
    this.canvas.setAttribute('aria-hidden', 'true');
    parent.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    this.motion.addEventListener('change', () => { if (this.motion.matches) this.clear(); });
  }

  setEnabled(value: boolean): void { this.enabled = value; if (!value) this.clear(); }

  burst(x: number, y: number, kind: BurstKind): void {
    if (!this.enabled || this.motion.matches || document.hidden || !this.ctx) return;
    const palette = kind === 'fire' ? ['#efb65f','#f4d886','#d47e50'] : kind === 'ink' ? ['#aba1b2','#79617e','#54465f'] : kind === 'water' ? ['#a4d4c9','#6fa8ad','#d3e2bf'] : kind === 'wrong' ? ['#e59b7f', '#c77662'] : kind === 'correct' ? ['#dce9a5', '#8fcd92', '#f3db91'] : kind === 'complete' ? ['#f1d88b', '#b5d398', '#e7e7d4', '#75b8b0'] : ['#c1d0b0', '#8dafaa'];
    const count = kind === 'complete' ? 48 : kind === 'correct' ? 23 : ['fire','ink','water'].includes(kind) ? 32 : 7;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = kind === 'complete' ? 65 + Math.random() * 190 : 25 + Math.random() * 100;
      const duration = kind === 'click' ? .3 : .45 + Math.random() * .3;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, size: 2 + Math.floor(Math.random() * 3), life: duration, duration, color: palette[i % palette.length] });
    }
    this.particles = this.particles.slice(-120);
    if (!this.frame) { this.previous = performance.now(); this.frame = requestAnimationFrame(time => this.draw(time)); }
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(innerWidth * dpr); this.canvas.height = Math.round(innerHeight * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private draw(time: number): void {
    this.frame = 0;
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min((time - this.previous) / 1000, .034); this.previous = time;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.particles = this.particles.filter(particle => particle.life > 0);
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 115 * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.duration * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (this.particles.length) this.frame = requestAnimationFrame(next => this.draw(next));
  }

  private clear(): void { cancelAnimationFrame(this.frame); this.frame = 0; this.particles = []; this.ctx?.clearRect(0, 0, innerWidth, innerHeight); }
}
