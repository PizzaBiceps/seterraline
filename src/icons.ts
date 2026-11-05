import compass from './assets/seterraline-compass.svg?raw';

/** Integer-grid silhouettes keep every control in the same pixel-art vocabulary. */
export function icon(name: string, size = 20): string {
 if (name === 'compass') return compass.replace('<svg ', `<svg width="${size}" height="${size}" aria-hidden="true" `);
 const shapes: Record<string, string> = {
  menu: 'M3 5h18v3H3zM3 11h18v3H3zM3 17h18v3H3z',
  sound: 'M3 9h4V7h3V5h3v16h-3v-2H7v-2H3zM16 8h2v10h-2zM20 5h2v16h-2z',
  muted: 'M3 9h4V7h3V5h3v16h-3v-2H7v-2H3zM16 9h2v2h2V9h2v2h-2v4h2v2h-2v-2h-2v2h-2v-2h2v-4h-2z',
  bulb: 'M7 3h10v2h3v9h-3v3H7v-3H4V5h3zM9 19h6v3H9z',
  skip: 'M4 4h3v3h4v3h4v4h-4v3H7v3H4zM18 4h3v16h-3z',
  reset: 'M7 3h11v3h3v11h-3v3H8v-3h10V6H8v4h4v3H2V3h3v4h2z',
  expand: 'M2 2h8v3H5v5H2zM14 2h8v8h-3V5h-5zM2 14h3v5h5v3H2zM19 14h3v8h-8v-3h5z',
  keyboard: 'M2 5h20v15H2zM4 8v2h3V8zM9 8v2h2V8zM13 8v2h2V8zM17 8v2h3V8zM4 12v2h3v-2zM9 12v2h2v-2zM13 12v2h2v-2zM17 12v2h3v-2zM6 16v2h12v-2z',
  help: 'M6 2h12v3h3v14h-3v3H6v-3H3V5h3zM8 6v3h3V8h3v3h-3v5h3v-3h3V6zM11 18v2h3v-2z',
  close: 'M4 3h3v3h3v3h4V6h3V3h3v4h-3v3h-3v4h3v3h3v4h-3v-3h-3v-3h-4v3H7v3H4v-4h3v-3h3v-4H7V7H4z',
  star: 'M10 2h4v6h3v2h5v4h-5v3h-3v5h-4v-5H7v-3H2v-4h5V8h3z',
  trophy: 'M7 2h10v3h5v8h-5v3h-3v3h4v3H6v-3h4v-3H7v-3H2V5h5zM4 7v4h3V7zM17 7v4h3V7z',
  arrow: 'M13 3h3v3h3v3h3v6h-3v3h-3v3h-3v-7H2v-4h11z',
  check: 'M2 11h3v3h3v3h3v-3h3v-3h3V8h3V5h3v6h-3v3h-3v3h-3v3H8v-3H5v-3H2z',
 };
 if (!shapes[name]) return icon('compass', size);
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" shape-rendering="crispEdges" aria-hidden="true"><path d="${shapes[name]}"/></svg>`;
}
