import type { AtlasRenderer } from './renderer';
export type MonsterKind = 'leviathan' | 'kraken' | 'dragon';
interface Monster { kind: MonsterKind; name: string; lon: number; lat: number; body: string }
/** Original block-built SVG creatures: the atlas remains vector-interactive underneath. */
const creatures: Monster[] = [
  { kind: 'leviathan', name: 'The singing leviathan', lon: -43, lat: 32, body: `<path fill="#648d83" d="M3 14h3v-3h4V8h13v3h5v7h-4v3H10v-3H6v-2H3zM25 12h4V7h3v3h3v5h-7z"/><path fill="#a2b99a" d="M8 15h17v3h-3v2H11v-2H8zM12 8h8v2h-8z"/><path fill="#d5d8a8" d="M9 11h2v2H9z"/><path fill="#365c60" d="M3 22h10v1H3zM20 23h12v1H20z"/><path fill="#81a49a" d="M16 3h2v4h-2zM13 2h2v2h-2zM19 1h2v2h-2z"/>` },
  { kind: 'kraken', name: 'The inky kraken', lon: 89, lat: -30, body: `<path fill="#7c8d8a" d="M13 4h10v3h3v10h-3v3H13v-3h-3V7h3zM7 14h3v8H4v-6H1v8h3v2h9v-7h3v6h5v-6h3v7h8v-3h3v-8h-3v6h-5v-7z"/><path fill="#a2ad96" d="M14 6h7v3h-7zM12 15h12v3H12zM5 22h6v2H5zM26 23h5v2h-5z"/><path fill="#e0d4a3" d="M13 11h3v3h-3zM21 11h3v3h-3z"/><path fill="#24464c" d="M14 12h1v2h-1zM21 12h1v2h-1zM17 17h3v2h-3z"/>` },
  { kind: 'dragon', name: 'Here be dragons', lon: -135, lat: -12, body: `<path fill="#a6ad7f" d="M3 19h6v-3h5v-5h7V6h8v3h4v5h-5v3h-4v5H10v2H3zM6 13h5v3H6z"/><path fill="#718c76" d="M13 15V4h3v3h3v3h3v7zM4 19H1v-4h3z"/><path fill="#c5c593" d="M15 17h8v3h-8zM22 8h5v2h-5zM24 2h3v4h-3zM29 4h2v4h-2z"/><path fill="#e9d995" d="M25 10h2v2h-2z"/><path fill="#365c60" d="M4 26h12v1H4zM23 25h10v1H23z"/>` },
];

export class SeaMonsters {
  private layer: HTMLElement;
  private buttons: { creature: Monster; element: HTMLButtonElement }[] = [];
  private cooldown = new Map<MonsterKind, number>();
  private motion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(parent: HTMLElement, private renderer: AtlasRenderer, private onDiscover: (kind: MonsterKind, x: number, y: number) => void) {
    this.layer = document.createElement('div'); this.layer.className = 'sea-monsters'; parent.append(this.layer);
    for (const creature of creatures) {
      const button = document.createElement('button'); button.className = `sea-monster ${creature.kind}`;
      button.setAttribute('aria-label', creature.name); button.title = creature.name;
      button.innerHTML = `<svg viewBox="0 0 36 28" width="64" height="50" shape-rendering="crispEdges" aria-hidden="true">${creature.body}</svg>`;
      button.onclick = event => {
        event.stopPropagation();
        const now = performance.now(); if (now - (this.cooldown.get(creature.kind) ?? -Infinity) < 1300) return;
        this.cooldown.set(creature.kind, now);
        const rect = button.getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        this.onDiscover(creature.kind, x, y); this.surprise(creature.kind, x, y);
        if (!this.motion.matches) button.animate([{ transform: 'translate(-50%, -50%) rotate(0)' }, { transform: 'translate(-50%, -65%) rotate(-8deg)', offset: .3 }, { transform: 'translate(-50%, -50%) rotate(0)' }], { duration: 550, easing: 'steps(5)' });
      };
      this.buttons.push({ creature, element: button }); this.layer.append(button);
    }
    this.update();
  }

  update(): void {
    for (const { creature, element } of this.buttons) {
      const p = this.renderer.project(creature.lon, creature.lat);
      const nearCenter = Math.hypot(p.x - innerWidth / 2, p.y - innerHeight / 2) < Math.min(innerWidth, innerHeight) * .32;
      element.hidden = this.renderer.zoomLevel < 2.8 || !nearCenter || p.x < 35 || p.x > innerWidth - 35 || p.y < 175 || p.y > innerHeight - 100;
      element.style.left = `${p.x}px`; element.style.top = `${p.y}px`;
    }
  }

  private surprise(kind: MonsterKind, x: number, y: number): void {
    const popup = document.createElement('div'); popup.className = `monster-surprise ${kind}`;
    popup.style.left = `${x}px`; popup.style.top = `${y}px`; popup.setAttribute('aria-hidden', 'true');
    if (kind === 'leviathan') popup.innerHTML = '<i></i><i></i><i></i><span>♪</span>';
    if (kind === 'kraken') popup.innerHTML = '<i></i><span>BLUB!</span>';
    if (kind === 'dragon') popup.innerHTML = '<i></i><span>HERE BE DRAGONS</span>';
    this.layer.append(popup);
    setTimeout(() => popup.remove(), this.motion.matches ? 1000 : 1500);
  }
}
