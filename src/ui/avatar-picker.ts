import { AVATAR_COLORS, defaultAvatar, validateAvatar } from '../game/avatar';
export function avatarSvg(value: unknown): string {
 let pixels: number[]; try { pixels=validateAvatar(value); } catch { pixels=defaultAvatar('fallback'); }
 return `<svg class="pixel-avatar" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges">${pixels.map((v,i)=>`<rect x="${i%9}" y="${Math.floor(i/9)}" width="1" height="1" fill="${AVATAR_COLORS[v]}"/>`).join('')}</svg>`;
}
export function avatarPicker(parent: HTMLElement): () => number[] {
 let pixels=defaultAvatar(crypto.randomUUID()), color=1, cursor=0;
 parent.innerHTML=`<div class="avatar-preview">${avatarSvg(pixels)}<span>Your avatar</span></div><details><summary>Draw your avatar</summary><p>9 × 9 mirrored pixels. Pick a color and tap squares.</p><canvas width="180" height="180" tabindex="0" aria-label="Pixel avatar editor. Arrow keys move; Space paints." class="avatar-editor"></canvas><div class="avatar-colors">${AVATAR_COLORS.map((hex,i)=>`<button type="button" data-color="${i}" style="background:${hex}" aria-label="${['Erase','Gold','Mint','Pink','Lavender'][i]}" aria-pressed="${i===1}"></button>`).join('')}</div><button type="button" class="text-button" data-avatar-random>RANDOMIZE</button><button type="button" class="text-button" data-avatar-clear>CLEAR</button></details>`;
 const canvas=parent.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
 function render(): void { pixels.forEach((v,i)=>{ctx.fillStyle=AVATAR_COLORS[v];ctx.fillRect(i%9*20,Math.floor(i/9)*20,20,20);ctx.strokeStyle='#ffffff25';ctx.strokeRect(i%9*20,Math.floor(i/9)*20,20,20);});parent.querySelector('.avatar-preview .pixel-avatar')!.outerHTML=avatarSvg(pixels); }
 function paint(index:number):void {const x=index%9,y=Math.floor(index/9);for(const yy of [y,8-y])for(const xx of [x,8-x])pixels[yy*9+xx]=color;render();}
 function pointer(event:PointerEvent):void { const r=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(8,Math.floor((event.clientX-r.left)/r.width*9))),y=Math.max(0,Math.min(8,Math.floor((event.clientY-r.top)/r.height*9)));cursor=y*9+x;paint(cursor); }
 canvas.onpointerdown=event=>{event.preventDefault();canvas.setPointerCapture(event.pointerId);pointer(event);};canvas.onpointermove=event=>{if(canvas.hasPointerCapture(event.pointerId))pointer(event);};
 canvas.onkeydown=event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))return;event.preventDefault();if(event.key===' ')paint(cursor);else {cursor=Math.max(0,Math.min(80,cursor+({'ArrowUp':-9,'ArrowDown':9,'ArrowLeft':-1,'ArrowRight':1}[event.key]||0)));render();ctx.strokeStyle='#fff';ctx.strokeRect(cursor%9*20+2,Math.floor(cursor/9)*20+2,16,16);}};
 parent.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button=>button.onclick=()=>{color=Number(button.dataset.color);parent.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
 parent.querySelector<HTMLButtonElement>('[data-avatar-random]')!.onclick=()=>{pixels=defaultAvatar(crypto.randomUUID());render();};parent.querySelector<HTMLButtonElement>('[data-avatar-clear]')!.onclick=()=>{pixels=Array(81).fill(0);render();};render();
 return ()=>[...pixels];
}
