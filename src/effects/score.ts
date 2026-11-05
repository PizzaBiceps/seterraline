/** Score motion lives outside match rules; no bonuses or timing affect the actual score. */
export class ScoreDisplay {
  private value = 0;
  private frame = 0;
  private pulse?: Animation;
  private rewards = new Set<HTMLElement>();
  private motion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private counter: HTMLElement, private parent: HTMLElement) {
    this.motion.addEventListener('change', () => { if (this.motion.matches) this.reset(this.value); });
  }

  reset(value = 0): void {
    cancelAnimationFrame(this.frame); this.frame = 0; this.pulse?.cancel();
    for (const reward of this.rewards) reward.remove();
    this.rewards.clear(); this.value = value; this.counter.textContent = String(value);
  }

  set(value: number): void {
    if (value === this.value) return;
    const from = Number(this.counter.textContent?.replaceAll(',', '') || 0);
    this.value = value; cancelAnimationFrame(this.frame);
    if (this.motion.matches || document.hidden) { this.counter.textContent = value.toLocaleString(); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 320);
      this.counter.textContent = Math.round(from + (value - from) * (1 - (1 - progress) ** 3)).toLocaleString();
      this.frame = progress < 1 ? requestAnimationFrame(tick) : 0;
    };
    this.frame = requestAnimationFrame(tick);
    this.pulse?.cancel();
    this.pulse = this.counter.animate([
      { transform: 'scale(1)', color: '#e7e7d4' },
      { transform: 'scale(1.3)', color: '#f7dc84', offset: .25 },
      { transform: 'scale(1)', color: '#e7e7d4' },
    ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  reward(points: number, x: number, y: number, streak: number): void {
    if (this.motion.matches || document.hidden) return;
    const node = document.createElement('div');
    node.className = 'score-reward'; node.setAttribute('aria-hidden', 'true');
    const gain = document.createElement('strong'); gain.textContent = `+${points}`; node.append(gain);
    if (streak >= 2) { const combo = document.createElement('span'); combo.textContent = `${streak} STREAK`; node.append(combo); }
    const startX = Math.max(55, Math.min(innerWidth - 55, x)), startY = Math.max(85, Math.min(innerHeight - 90, y - 30));
    node.style.left = `${startX}px`; node.style.top = `${startY}px`; this.parent.append(node); this.rewards.add(node);
    const rect = this.counter.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - startX, dy = rect.top + rect.height / 2 - startY;
    const animation = node.animate([
      { transform: 'translate(-50%, 0) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%, -14px) scale(1.15)', opacity: 1, offset: .15 },
      { transform: 'translate(-50%, -22px) scale(1)', opacity: 1, offset: .5 },
      { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(.4)`, opacity: 0 },
    ], { duration: 1000, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' });
    animation.onfinish = () => { node.remove(); this.rewards.delete(node); };
  }
}
