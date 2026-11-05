import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Atlas } from './renderer';

const W = 1800, H = 960;
const BOUNDS = { left: -540, top: -288, width: 1080, height: 576 };
const projection = geoNaturalEarth1().translate([0, 0]).scale(178);
const hash = (x: number, y: number): number => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; };
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, y: number): number { const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy); return mix(mix(hash(ix, iy), hash(ix + 1, iy), fx), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy); }
const fbm = (x: number, y: number) => noise(x, y) * .6 + noise(x * 2.07, y * 2.07) * .28 + noise(x * 4.2, y * 4.2) * .12;
const RGB = (hex: string) => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
const forest = ['426c54','4c7757','5b835d','6a9065','7b9b6b'].map(RGB);
const grass = ['7e9b6b','8ca672','9caf7b','abb780','b6bd8a'].map(RGB);
const desert = ['b6a570','c0af7a','cbb984','d5c48e','dfcf9d'].map(RGB);
const ice = ['a8c5bf','bed2c7','d3ddce','e2e6d4','edf0e2'].map(RGB);
const rock = ['6f8062','83916d','95a07c','a3ab85','b4b48b'].map(RGB);
const water = RGB('25454f'), shelf = RGB('335e63'), beach = RGB('c3c496');
// These bands are art direction, not measured elevation or land-cover data.
const ranges = [
 { width: 8, points: [[-150,60],[-130,52],[-120,43],[-111,36],[-106,27]] },
 { width: 6, points: [[-77,8],[-78,-1],[-75,-12],[-69,-23],[-70,-38],[-73,-50]] },
 { width: 5, points: [[66,36],[74,36],[83,30],[91,28],[98,27]] },
 { width: 4, points: [[5,45],[11,47],[16,46]] },
 { width: 4, points: [[9,61],[18,68],[23,70]] },
 { width: 5, points: [[-10,30],[-3,33],[8,35]] },
 { width: 4, points: [[36,12],[38,3],[34,-10]] },
 { width: 4, points: [[143,-17],[151,-28],[147,-38]] },
 { width: 4, points: [[173,-40],[169,-45]] },
 { width: 4, points: [[128,42],[138,37],[142,43]] },
 { width: 4, points: [[100,48],[110,55],[125,57],[140,61]] },
].map(r => ({ width: r.width, points: r.points.map(p => projection(p as [number, number])!) }));
function distance(x: number, y: number, a: number[], b: number[]): number { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); }
function ellipse(lon: number, lat: number, x: number, y: number, w: number, h: number) { return Math.max(0, 1 - ((lon - x) / w) ** 2 - ((lat - y) / h) ** 2); }
// Anchor the decorative Giza cluster geographically, using the terrain's projection.
// Keep this separate so the existing baked artwork can receive just this addition.
export function drawTerrainLandmarks(ctx: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>): void {
 const point = projection([31.1342, 29.9792])!;
 const x = Math.round((point[0] - BOUNDS.left) / BOUNDS.width * W);
 const y = Math.round((point[1] - BOUNDS.top) / BOUNDS.height * H);
 for (const [dx, dy, height] of [[-9, 6, 2], [-5, 3, 3], [0, 0, 4]]) {
   const px = x + dx, py = y + dy;
   ctx.fillStyle = '#c5b582';
   ctx.fillRect(px - height + 1, py + 1, height * 2, 1);
   for (let row = 0; row < height; row++) {
     ctx.fillStyle = '#dfcb91';
     ctx.fillRect(px - row, py - height + 1 + row, row + 1, 1);
     ctx.fillStyle = '#cbbb85';
     ctx.fillRect(px + 1, py - height + 1 + row, row, 1);
   }
 }
}
export function createTerrain(atlas: Atlas): HTMLCanvasElement {
 const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
 const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
 ctx.translate(W / 2, H / 2); ctx.scale(W / BOUNDS.width, H / BOUNDS.height);
 const path = geoPath(projection, ctx); ctx.beginPath(); path(atlas); ctx.fillStyle = '#fff'; ctx.fill(); ctx.resetTransform();
 const mask = ctx.getImageData(0, 0, W, H).data;
 const altitude = new Float32Array(W * H), latitudes = new Float32Array(W * H), longitudes = new Float32Array(W * H);
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
   const i = y * W + x; if (mask[i * 4 + 3] < 128) continue;
   const wx = x / W * BOUNDS.width + BOUNDS.left, wy = y / H * BOUNDS.height + BOUNDS.top;
   const ll = projection.invert!([wx, wy])!; longitudes[i] = ll[0]; latitudes[i] = ll[1];
   let ridge = 0;
   for (const r of ranges) for (let j = 1; j < r.points.length; j++) ridge = Math.max(ridge, Math.max(0, 1 - distance(wx, wy, r.points[j - 1], r.points[j]) / r.width));
   altitude[i] = Math.max(0, ridge * (.45 + .65 * fbm(wx * .19 + 41, wy * .19 + 71)));
 }
 const image = ctx.createImageData(W, H), data = image.data;
 const land = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && mask[(y * W + x) * 4 + 3] >= 128;
 for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
   const i = y * W + x, p = i * 4, n = fbm(x * .025, y * .025), grain = hash(x, y); let color: number[];
   if (!land(x, y)) {
     const coast = land(x - 4, y) || land(x + 4, y) || land(x, y - 4) || land(x, y + 4);
     const outer = land(x - 9, y) || land(x + 9, y) || land(x, y - 9) || land(x, y + 9);
     const wave = (y % 19 === 0 && x % 47 < 5) || (y % 19 === 1 && x % 47 === 5);
     color = coast ? shelf : outer ? [43,80,87] : water;
     if (wave && !coast) color = color.map(c => c + 7);
   } else {
     const lat = latitudes[i] + (fbm(x * .04 + 71, y * .04 + 90) - .5) * 7, lon = longitudes[i] + (fbm(x * .03 + 21, y * .03 + 63) - .5) * 10, h = altitude[i];
     const arid = Math.max(ellipse(lon, lat, 15, 24, 39, 15), ellipse(lon, lat, 47, 24, 18, 15), ellipse(lon, lat, 134, -25, 20, 14), ellipse(lon, lat, 94, 43, 27, 11), ellipse(lon, lat, -112, 33, 13, 9));
     const tropical = Math.max(ellipse(lon, lat, -62, -5, 24, 15), ellipse(lon, lat, 24, 0, 20, 14), ellipse(lon, lat, 112, 4, 35, 15));
     let palette = (tropical + (n - .5) * .9 > .28 || lat > 42 + n * 15 && lat < 64 + n * 12 || n < .33) ? forest : grass;
     if (arid + (n - .5) * .8 > .28) palette = desert;
     if (h > .43) palette = rock;
     if (lat > 68 + n * 13 || (lon > -70 && lon < -18 && lat > 62)) palette = ice;
     const slope = (altitude[Math.max(0, i - W - 1)] - altitude[Math.min(altitude.length - 1, i + W + 1)]) * 2.4;
     let level = Math.floor(Math.max(0, Math.min(.99, n + slope)) * palette.length);
     if (grain < .14) level = Math.max(0, level - 1);
     color = palette[level];
     // Tiny stepped tree clusters, with sparse frequency and two shades.
     if (palette === forest && h < .35) {
       const cellX = Math.floor(x / 9), cellY = Math.floor(y / 9), cell = hash(cellX + 80, cellY + 25);
       const px = x % 9 - 3 - Math.floor(cell * 3), py = y % 9 - 1 - Math.floor(cell * 2);
       if (cell > .35 && ((py === 0 && px === 0) || (py === 1 && Math.abs(px) <= 1) || (py === 2 && Math.abs(px) <= 2))) color = forest[0];
       if (cell > .35 && py === 3 && px === 0) color = RGB('365a49');
     }
     if (!land(x - 1, y) || !land(x, y - 1)) color = palette === ice ? ice[3] : beach;
   }
   data[p] = color[0]; data[p + 1] = color[1]; data[p + 2] = color[2]; data[p + 3] = 255;
 }
 ctx.putImageData(image, 0, 0);
 // Hand-built pixel mountain silhouettes. The small stepped clusters stay legible when zoomed.
 for(let y=7;y<H-9;y+=8) for(let x=7;x<W-9;x+=8){
   const jitter=hash(x+81,y+34), px=x+Math.floor(jitter*4)-2, py=y+Math.floor(hash(x,y+31)*4)-2;
   const h=altitude[py*W+px]; if(h<.35 || jitter<.24 || !land(px,py) || latitudes[py*W+px]>72)continue;
   const height=h>.6?7:5;
   for(let row=0;row<height;row++){
     const half=Math.floor(row*.7);
     ctx.fillStyle='#b9b89a';ctx.fillRect(px-half,py-height+row,half+1,1);
     ctx.fillStyle='#657563';ctx.fillRect(px+1,py-height+row,half,1);
   }
   ctx.fillStyle=h>.65?'#e0e1c9':'#d0cfb2';ctx.fillRect(px,py-height,1,2);if(h>.65)ctx.fillRect(px-1,py-height+2,3,1);
   ctx.fillStyle='#536b58';ctx.fillRect(px-2,py,5,1);
 }
 drawTerrainLandmarks(ctx);
 return canvas;
}
