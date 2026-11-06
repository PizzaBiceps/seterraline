export function dunceCap(): string {
 return '<span class="dunce-cap" role="img" aria-label="Dunce cap"><svg viewBox="0 0 32 36" aria-hidden="true"><path fill="#f1dfb3" stroke="#9a7952" stroke-width="2" d="M16 2 30 32H2Z"/><path fill="#d0b888" d="M16 2v30h14Z"/><text x="16" y="27" text-anchor="middle" font-size="13" fill="#533e36" font-family="monospace">D</text></svg></span>';
}
export function showDunceSlots(hit: boolean): void {
 const panel = document.createElement('section'); panel.className = 'dunce-slots'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Last-place bonus spin');
 panel.innerHTML = '<h2>BONUS SPIN</h2><div class="slot-reels" aria-hidden="true">'+[0,1,2].map(()=>'<span><i>★<br>▲<br>?<br>★<br>▲<br>?</i></span>').join('')+'</div><p role="status">Rolling your luck…</p><button class="secondary-button" disabled>SPINNING</button>';
 document.body.append(panel);
 const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 2400;
 setTimeout(()=>{
  if (!panel.isConnected) return;
  panel.classList.add('settled');
  panel.querySelector('.slot-reels')!.innerHTML = [0,1,2].map(()=>`<span>${hit ? dunceCap() : '★'}</span>`).join('');
  panel.querySelector('p')!.textContent = hit ? 'Dunce cap unlocked. Wear it with pride.' : 'No cap this time. Lucky escape!';
  const button=panel.querySelector('button')!; button.disabled=false; button.textContent='CONTINUE'; button.onclick=()=>panel.remove(); button.focus();
 },delay);
}
