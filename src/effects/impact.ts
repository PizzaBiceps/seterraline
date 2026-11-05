/** Event-only pixel accents. No screen shake, idle loop, or full-screen flashes. */
export class ImpactEffects {
 private enabled = true;
 private motion = matchMedia('(prefers-reduced-motion: reduce)');
 private active = new Set<HTMLElement>();
 constructor(private parent: HTMLElement) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  this.motion.addEventListener('change', () => { if (this.motion.matches) this.clear(); });
 }
 setEnabled(value: boolean): void { this.enabled = value; if (!value) this.clear(); }
 ring(x: number, y: number, kind: 'click' | 'correct' | 'wrong'): void {
  if (!this.enabled || this.motion.matches || document.hidden) return;
  const node = document.createElement('i'); node.className = `pixel-impact ${kind}`;
  node.style.left = `${x}px`; node.style.top = `${y}px`; node.setAttribute('aria-hidden','true');
  this.add(node,500);
 }
 miss(target: HTMLElement): void {
  if (!this.enabled || this.motion.matches || document.hidden) return;
  target.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'translateX(0)'}],{duration:180,easing:'steps(2)'});
 }
 fail(target: HTMLElement): Animation | undefined {
  if (!this.enabled || document.hidden) return;
  const frames: Keyframe[] = this.motion.matches ? [{ color: '#f1786b' }, { color: '#f1786b' }] : [
   { color: getComputedStyle(target).color, opacity: 1, transform: 'translateX(0) scale(1)' },
   { color: '#f1786b', opacity: 1, transform: 'translateX(-4px) scale(1.06)', offset: .22 },
   { color: '#f1786b', opacity: 1, transform: 'translateX(4px) scale(1.06)', offset: .36 },
   { color: '#ed6559', opacity: .9, transform: 'translateX(-2px) scale(1.03)', offset: .52 },
   { color: '#ed6559', opacity: 0, transform: 'translateX(0) scale(.97)' },
  ];
  return target.animate(frames, { duration: 420, easing: 'ease-out', fill: 'forwards' });
 }
 private add(node: HTMLElement, lifetime: number): void {
  if (this.active.size >= 12) { const oldest = this.active.values().next().value; oldest?.remove(); if (oldest) this.active.delete(oldest); }
  this.active.add(node); this.parent.append(node);
  setTimeout(() => { node.remove(); this.active.delete(node); },lifetime);
 }
 private clear(): void { for (const node of this.active) node.remove(); this.active.clear(); }
}
