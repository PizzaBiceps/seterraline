export const AVATAR_COLORS = ['#18313a','#f2ddb1','#9bd7c4','#e89ba9','#aebcf0'] as const;
export function defaultAvatar(seed: string): number[] {
 let bits=2166136261; for (const char of seed) bits=Math.imul(bits^char.charCodeAt(0),16777619);
 const next=()=>{bits^=bits<<13;bits^=bits>>>17;bits^=bits<<5;return bits>>>0;};
 const pixels=Array<number>(81).fill(0), color=1+next()%4;
 for(let y=0;y<5;y++)for(let x=0;x<5;x++) { const value=next()%3 ? color : 0; for(const yy of [y,8-y])for(const xx of [x,8-x])pixels[yy*9+xx]=value; }
 pixels[40]=color; return pixels;
}
export function validateAvatar(value: unknown): number[] {
 if (!Array.isArray(value)||value.length!==81||!value.every(v=>Number.isInteger(v)&&v>=0&&v<AVATAR_COLORS.length)) throw new Error('Choose a valid pixel avatar.');
 // Keep the small mirrored format authoritative, even for custom clients.
 const pixels=[...value]; for(let y=0;y<5;y++)for(let x=0;x<5;x++)for(const yy of [y,8-y])for(const xx of [x,8-x])pixels[yy*9+xx]=pixels[y*9+x];
 return pixels;
}
