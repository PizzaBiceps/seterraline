/** Heat belongs to the lettering; only a few detached embers need a canvas. */
export class StreakHeat {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pulses: Animation[] = [];
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private streak = 0;
  private tick = 0;
  private anchors: { x: number; y: number }[][] = [];

  constructor(private targets: HTMLElement[], parent: HTMLElement) {
    this.canvas.className = 'streak-embers';
    this.canvas.setAttribute('aria-hidden', 'true');
    parent.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    const measure = () => this.measure();
    const observer = new ResizeObserver(measure);
    targets.forEach(target => observer.observe(target));
    // Equal-width country names still need fresh glyph-edge positions.
    const textObserver = new MutationObserver(measure);
    targets.slice(0, 2).forEach(target => textObserver.observe(target, { childList: true, characterData: true, subtree: true }));
    window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', () => this.refresh());
    this.motion.addEventListener('change', () => { this.pulses.forEach(p => p.cancel()); this.refresh(); });
    measure();
  }

  private measure(): void {
    this.canvas.width = Math.ceil(innerWidth / 2);
    this.canvas.height = Math.ceil(innerHeight / 2);
    this.anchors = this.targets.map(target => {
      const rect = target.getBoundingClientRect(), style = getComputedStyle(target);
      const mask = document.createElement('canvas');
      mask.width = Math.ceil(rect.width); mask.height = Math.ceil(rect.height);
      const ctx = mask.getContext('2d', { willReadFrequently: true });
      if (!ctx || !mask.width || !mask.height) return [];
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.textBaseline = 'top';
      const spacing = parseFloat(style.letterSpacing) || 0;
      let x = 0;
      for (const letter of target.textContent || '') {
        ctx.fillText(letter, x, 0); x += ctx.measureText(letter).width + spacing;
      }
      const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
      const points: { x: number; y: number }[] = [];
      for (let x = 1; x < mask.width; x += 4) for (let y = 0; y < mask.height; y++) {
        if (pixels[(y * mask.width + x) * 4 + 3] > 160) {
          points.push({ x: (rect.left + x) / 2, y: (rect.top + y) / 2 }); break;
        }
      }
      return points;
    });
  }

  set(streak: number): void {
    this.streak = streak;
    this.pulses.forEach(p => p.cancel()); this.pulses = [];
    const heat = streak < 2 ? 0 : streak >= 10 ? Math.min(5, 4 + Math.floor((streak - 10) / 5)) : Math.min(3, 1 + Math.floor((streak - 2) / 3));
    this.targets.forEach((target, index) => {
      target.dataset.heat = String(heat);
      if (heat && !this.motion.matches && !document.hidden) this.pulses.push(target.animate([
        { backgroundPosition: '0 0' },
        { backgroundPosition: '0 100%', offset: .3 },
        { backgroundPosition: '0 0' },
      ], { delay: index * 110, duration: 430, easing: 'steps(5)' }));
    });
    this.refresh();
  }

  private refresh(): void {
    clearTimeout(this.timer); this.timer = undefined;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.streak >= 5 && !this.motion.matches && !document.hidden) this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!document.querySelector('dialog[open]')) this.anchors.forEach((points, targetIndex) => {
      if (!points.length) return;
      const count = Math.min(7, 2 + Math.floor((this.streak - 5) / 2));
      for (let i = 0; i < count; i++) {
        const cycle = this.tick + i * 9 + targetIndex * 5;
        const age = cycle % 27 / 27;
        const origin = points[(i * 13 + Math.floor(cycle / 27) * 7) % points.length];
        ctx.globalAlpha = (1 - age) * .85;
        ctx.fillStyle = this.streak >= 10 ? (i % 2 ? '#d9faff' : '#62baff') : (i % 2 ? '#fff0af' : '#ffab4c');
        ctx.fillRect(Math.round(origin.x + Math.sin(age * 4 + i) * age * 3), Math.round(origin.y - age * (9 + Math.min(9, this.streak))), 1, age < .25 ? 2 : 1);
      }
      if (this.streak >= 10) {
        // Small glyph-edge flickers, never a solid sheet behind the text.
        const tongues = Math.min(8, 3 + Math.floor((this.streak - 10) / 2));
        for (let i = 0; i < tongues; i++) {
          const cycle = this.tick + i * 5 + targetIndex * 3;
          const origin = points[(i * 11 + Math.floor(cycle / 12) * 3) % points.length];
          const life = cycle % 12 / 12;
          const height = Math.round(Math.sin(life * Math.PI) * (3 + Math.min(5, (this.streak - 8) * .4)));
          ctx.globalAlpha = .75 * (1 - life * .5);
          for (let row = 0; row < height; row++) {
            const curl = Math.round(Math.sin(life * 5 + row * .7 + i) * row * .25);
            ctx.fillStyle = row < 2 ? '#c6f7ff' : row < height * .7 ? '#64c9ff' : '#5188ee';
            ctx.fillRect(Math.round(origin.x + curl), Math.round(origin.y - row), row < 2 ? 2 : 1, 1);
          }
        }
      }
    });
    ctx.globalAlpha = 1;
    this.tick++;
    this.timer = setTimeout(() => this.draw(), 85);
  }
}
