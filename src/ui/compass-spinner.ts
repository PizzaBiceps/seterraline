import compass from '../assets/seterraline-compass.svg?raw';
import './compass-spinner.css';

const silhouette = 'M13 1h10v1h3v2h1v3h2v3h1v11h-1v3h-2v3h-3v2H13v-1h-3v-2H7v-3H6V9h1V6h1V4h3V2h2z';
// Each perimeter segment gets a solid side face, including at exactly 90° and 270°.
const perimeter = [[13, 1], [23, 1], [23, 2], [26, 2], [26, 4], [27, 4], [27, 7], [29, 7], [29, 10], [30, 10], [30, 21], [29, 21], [29, 24], [27, 24], [27, 27], [24, 27], [24, 29], [13, 29], [13, 28], [10, 28], [10, 26], [7, 26], [7, 23], [6, 23], [6, 9], [7, 9], [7, 6], [8, 6], [8, 4], [11, 4], [11, 2], [13, 2]];
const sides = perimeter.map(([x, y], i) => {
 const [nextX, nextY] = perimeter[(i + 1) % perimeter.length];
 const dx = nextX - x, dy = nextY - y;
 const color = dx > 0 ? '#a77546' : dx < 0 ? '#38271c' : dy > 0 ? '#513421' : '#805333';
 return `<span class="compass-spinner-side" style="width:${Math.abs(dx || dy)}px;background:${color};transform:translate3d(${x}px,${y}px,-3px) rotateZ(${Math.atan2(dy, dx) * 180 / Math.PI}deg) rotateX(90deg)"></span>`;
}).join('');
const back = `<svg viewBox="0 0 32 32" fill="none" shape-rendering="crispEdges">
 <g transform="translate(32 0) scale(-1 1)">
 <path fill="#241b16" d="${silhouette}"/>
 <path fill="#674128" d="M13 2h10v1h3v2h1v3h2v12h-1v4h-1v2h-4v2H13v-1h-3v-2H8v-2H7V10h1V7h1V5h2V3h2z"/>
 <path fill="#a77546" d="M13 2h10v1H14v1h-3v2H9v4H8v10H7V10h1V7h1V5h2V3h2z"/>
 <path fill="#805333" d="M14 5h8v1h3v3h1v12h-2v3h-3v1h-7v-1h-3v-3H9V10h2V7h3z"/>
 </g>
 <g transform="translate(-4 0)">
 <path fill="#513421" d="M13 11h2v-1h7v1h-6v3h5v1h1v5h-2v1h-7v-1h7v-4h-5v-1h-2z"/>
 <path fill="#a77546" d="M14 10h7v1h-7zM14 15h6v1h-6zM13 20h7v1h-7z"/>
 </g>
</svg>`;

/** Closed pixel-art casing gives the compass real thickness through a full turn. */
export function compassSpinner(size = 32): string {
 return `<span class="compass-spinner" style="--compass-size:${size}px;--compass-scale:${size / 32}" aria-hidden="true"><span class="compass-spinner-scale"><span class="compass-spinner-rotor">
  ${sides}
  <span class="compass-spinner-face compass-spinner-back">${back}</span>
  <span class="compass-spinner-face compass-spinner-front">${compass}</span>
 </span></span></span>`;
}

/** Play once, then restore the exact static mark and discard the 3D faces. */
export function playCompassArrival(mount: HTMLElement): boolean {
 if (mount.querySelector('.compass-spinner') || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
 mount.dataset.arrived = 'true';
 const original = mount.innerHTML;
 mount.innerHTML = compassSpinner(32);
 const spinner = mount.querySelector<HTMLElement>('.compass-spinner')!;
 const rotor = mount.querySelector<HTMLElement>('.compass-spinner-rotor')!;
 spinner.classList.add('compass-arrival');
 const settle = () => { mount.innerHTML = original; };
 rotor.addEventListener('animationend', settle, { once: true });
 rotor.addEventListener('animationcancel', settle, { once: true });
 return true;
}
