/** Original pixel medals for completion order, independent from the score ranking. */
export function finishMedal(place?: number): string {
 if (place !== 1 && place !== 2) return '';
 const gold = place === 1;
 const bright = gold ? '#fff0a6' : '#edfcff', face = gold ? '#f2b940' : '#b6d4e2', shadow = gold ? '#a65b24' : '#56758b';
 return `<span class="finish-medal ${gold ? 'gold' : 'silver'}" role="img" aria-label="${gold ? 'Gold: first' : 'Silver: second'} to finish" title="${gold ? '1st' : '2nd'} to finish"><svg viewBox="0 0 40 48" aria-hidden="true" shape-rendering="crispEdges"><path fill="#532c5e" d="M8 2h10v22H8zM22 2h10v22H22z"/><path fill="#dd6c9c" d="M10 2h4v20h-4zM24 2h4v20h-4z"/><path fill="${shadow}" d="M12 15h16v4h6v6h4v14h-4v5h-6v4H12v-4H6v-5H2V25h4v-6h6z"/><path fill="${face}" d="M12 17h16v4h6v6h2v10h-4v5h-6v3H14v-3H8v-5H4V27h2v-6h6z"/><path fill="${bright}" d="M12 19h16v3H12zM8 23h4v5H8zM6 29h3v8H6z"/><path fill="${shadow}" d="M18 22h4v5h5v4h4v4h-6v6H15v-6H9v-4h4v-4h5z"/><text x="20" y="37" text-anchor="middle" fill="${bright}" font-family="monospace" font-size="15" font-weight="bold">${place}</text><path fill="${bright}" d="M1 9h3V6h2v3h3v2H6v3H4v-3H1zM32 3h2V1h2v2h3v2h-3v3h-2V5h-2z"/></svg></span>`;
}
