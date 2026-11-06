/** Original 16-pixel cartographer's tools, drawn with a shared ink/brass/paper palette. */
export function cornerIcon(name:string,size:number):string|undefined {
 const shapes:Record<string,string>={
  menu:'<path fill="#142a30" d="M2 1h12v14H2z"/><path fill="#b6a276" d="M3 2h10v12H3z"/><path fill="#e6d6a2" d="M4 3h8v9H4z"/><path fill="#769785" d="M5 4h3v2h2v3H7V7H5z"/><path fill="#9b6750" d="M8 2h1v11H8z"/><path fill="#f2dfa4" d="M3 13h10v1H3z"/>',
  bulb:'<path fill="#142a30" d="M5 1h6v2h2v10h-2v2H5v-2H3V3h2z"/><path fill="#b89c62" d="M6 1h4v2H6zM4 3h8v2H4zM4 12h8v2H4z"/><path fill="#e0d2a0" d="M5 5h6v7H5z"/><path fill="#d88d48" d="M7 6h2v2h1v3H6V8h1z"/><path fill="#fff0a8" d="M7 8h2v3H7z"/><path fill="#718f83" d="M3 5h1v7H3zM12 5h1v7h-1z"/>',
  skip:'<path fill="#142a30" d="M1 3h10v2h3v2h2v2h-2v2h-3v2H1z"/><path fill="#9b7955" d="M2 4h8v2H2zM2 10h8v2H2z"/><path fill="#d8cc9b" d="M2 6h9V4h1v2h2v1h1v2h-1v1h-2v2h-1v-2H2z"/><path fill="#7e9c88" d="M4 7h6v2H4z"/>',
  expand:'<path fill="#142a30" d="M2 2h12v12H2z"/><path fill="#b99f70" d="M3 3h10v10H3z"/><path fill="#e5d6a5" d="M4 4h8v8H4z"/><path fill="#709783" d="M6 4h2v2h2v3H8v2H6V8H4V6h2z"/><path fill="#c3865b" d="M11 3h2v2h-2zM3 11h2v2H3z"/>',
  party:'<path fill="#142a30" d="M5 1h6v2h1v6h3v6H1V9h3V3h1z"/><path fill="#e1c491" d="M6 2h4v4H6z"/><path fill="#b98967" d="M2 6h3v3H2zM11 6h3v3h-3z"/><path fill="#7ca79a" d="M5 7h6v7H5z"/><path fill="#a2b6d0" d="M1 10h3v4H1zM12 10h3v4h-3z"/><path fill="#e8ddae" d="M7 8h2v2H7z"/>',
  coin:'<path fill="#142a30" d="M5 0h6v2h3v3h2v6h-2v3h-3v2H5v-2H2v-3H0V5h2V2h3z"/><path fill="#9e713d" d="M5 1h6v2h3v9h-3v3H5v-3H2V4h3z"/><path fill="#ebcd79" d="M5 2h6v2h2v7h-2v3H5v-2H3V5h2z"/><path fill="#fff1b4" d="M5 3h5v1H5zM4 4h1v3H4z"/><path fill="#b97a40" d="M7 4h2v3h3v2H9v3H7V9H4V7h3z"/><path fill="#fff0af" d="M7 6h2v3H7z"/>',
  hourglass:'<path fill="#142a30" d="M2 1h12v3h-2v2l-3 2 3 2v2h2v3H2v-3h2v-2l3-2-3-2V4H2z"/><path fill="#bda16a" d="M3 2h10v1H3zM3 13h10v1H3z"/><path fill="#c2d5c2" d="M5 4h6v2H9v4h2v2H5v-2h2V6H5z"/><path fill="#ecc878" d="M6 4h4v1H6zM7 10h2v1h2v1H5v-1h2z"/>',
 };
 if(name==='zoom-in'||name==='zoom-out')return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#142a30" d="M3 1h7v2h2v7h-2v2H3v-2H1V3h2zM10 10h3v2h2v3h-3v-2h-2z"/><path fill="#9bb5a0" d="M3 3h7v7H3z"/><path fill="#b8dac5" d="M4 3h4v1H4z"/><path fill="#9f8059" d="M11 11h2v2h2v1h-2v-1h-2z"/><path fill="#294b48" d="M4 6h5v1H4z${name==='zoom-in'?'M6 4h1v5H6z':''}"/></svg>`;
 if(!shapes[name])return undefined;
 return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${shapes[name]}</svg>`;
}
