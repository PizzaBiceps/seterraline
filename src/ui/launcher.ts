import { eligible, type Country, type Mode, type Region } from '../game/engine';
import { parsePartyInvite } from '../game/invite';
import { setPixelFlag } from './pixel-flag';
const AREAS:Region[]=['World','Europe','Africa','Asia','Americas','Oceania'];
/** Launch choices stay presentation-only; solo and party games still share the same rules. */
export function showGameLauncher(root:HTMLElement,countries:Country[],rounds:number,start:(mode:Mode,region:Region,rounds:number)=>void,party:(code?:string,rounds?:number)=>void):void {
 let length=rounds;
 const roundControl=()=>`<label class="launch-rounds">Round length<select id="launch-rounds"><option value="10" ${length===10?'selected':''}>10 countries</option><option value="20" ${length===20?'selected':''}>20 countries</option><option value="0" ${length===0?'selected':''}>All countries</option></select></label>`;
 const bindRounds=()=>{root.querySelector<HTMLSelectElement>('#launch-rounds')!.onchange=event=>{length=Number((event.target as HTMLSelectElement).value);};};
 function areas():void {
  root.innerHTML=`<div class="launch-content"><button class="launch-back text-button" id="launch-back">← GAME MODES</button><h1>CHOOSE YOUR MAP</h1><p>Explore the whole world, or focus on one area.</p><div class="launch-areas">${AREAS.map(area=>`<button class="launch-area ${area==='World'?'default-mode':''}" data-area="${area}"><strong>${area}</strong><span>${eligible(countries,area).length} countries</span></button>`).join('')}</div>${roundControl()}</div>`;
  root.querySelector<HTMLButtonElement>('#launch-back')!.onclick=modes;bindRounds();
  root.querySelectorAll<HTMLButtonElement>('[data-area]').forEach(button=>button.onclick=()=>start('countries',button.dataset.area as Region,length));
  root.querySelector<HTMLButtonElement>('[data-area]')!.focus({preventScroll:true});
 }
 function modes():void {
  root.innerHTML=`<div class="launch-content"><p class="launch-eyebrow">SETERRALINE</p><h1>CHOOSE YOUR GAME</h1><div class="launch-modes"><button class="launch-mode default-mode" data-mode="countries"><span class="launch-art world-art"><img src="${import.meta.env.BASE_URL}data/pixel-terrain.png" alt=""></span><span class="launch-default">DEFAULT</span><strong>WORLD</strong><span>Find countries on the map.</span><small>World or a continent →</small></button><button class="launch-mode" data-mode="flags"><span class="launch-art flag-art"><img data-launch-flag="se" alt=""><img data-launch-flag="jp" alt=""><img data-launch-flag="br" alt=""></span><strong>FLAGS</strong><span>See a flag. Pick its country.</span><small>Multiple choice →</small></button><button class="launch-mode" data-mode="flag-map"><span class="launch-art flag-country-art"><img data-launch-flag="se" alt=""><span aria-hidden="true">↓</span><img class="launch-atlas" src="${import.meta.env.BASE_URL}data/pixel-terrain.png" alt=""></span><strong>FLAG → COUNTRY</strong><span>Find the flag’s country on the map.</span><small>Explore the atlas →</small></button></div><div class="launch-bottom">${roundControl()}<div class="launch-party-actions"><button id="launch-party" class="secondary-button">CREATE PARTY</button><form id="launch-join"><label for="launch-invite">JOIN PARTY</label><div class="launch-join-row"><input id="launch-invite" required maxlength="2048" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Invite link or party code"><button class="primary-button" type="submit">JOIN</button></div><p id="launch-join-error" role="alert"></p></form></div></div></div>`;
  root.querySelectorAll<HTMLImageElement>('[data-launch-flag]').forEach(image=>setPixelFlag(image,image.dataset.launchFlag!));
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>button.dataset.mode==='countries'?areas():start(button.dataset.mode as Mode,'World',length));
  root.querySelector<HTMLButtonElement>('#launch-party')!.onclick=()=>party(undefined,length);
  root.querySelector<HTMLFormElement>('#launch-join')!.onsubmit=event=>{event.preventDefault();const input=root.querySelector<HTMLInputElement>('#launch-invite')!,code=parsePartyInvite(input.value),error=root.querySelector<HTMLElement>('#launch-join-error')!;if(!code){error.textContent='Paste an invite link or a 16-character party code.';input.setAttribute('aria-invalid','true');input.focus();return;}error.textContent='';input.removeAttribute('aria-invalid');party(code);};bindRounds();
 }
 root.hidden=false;modes();
}
