import { compassSpinner } from './compass-spinner';

for (const mount of document.querySelectorAll<HTMLElement>('[data-compass-size]')) {
 mount.innerHTML = compassSpinner(Number(mount.dataset.compassSize));
}
const toggle = document.querySelector<HTMLButtonElement>('#toggle-animation')!;
const turn = document.querySelector<HTMLInputElement>('#turn-angle')!;
turn.oninput = () => {
 document.querySelectorAll<HTMLElement>('.compass-spinner-rotor').forEach(rotor => {
  rotor.style.animation = 'none';
  rotor.style.transform = `rotateY(${turn.value}deg)`;
 });
 toggle.setAttribute('aria-pressed', 'true');
 toggle.textContent = 'Resume rotation';
};
toggle.onclick = () => {
 const paused = toggle.getAttribute('aria-pressed') !== 'true';
 toggle.setAttribute('aria-pressed', String(paused));
 toggle.textContent = paused ? 'Resume rotation' : 'Pause rotation';
 if (!paused) document.querySelectorAll<HTMLElement>('.compass-spinner-rotor').forEach(rotor => {
  rotor.style.removeProperty('animation');
  rotor.style.removeProperty('transform');
 });
 document.querySelectorAll('.compass-spinner').forEach(spinner => spinner.classList.toggle('is-paused', paused));
};
const motion = matchMedia('(prefers-reduced-motion: reduce)');
function syncMotion(): void {
 toggle.disabled = motion.matches;
 document.querySelector<HTMLElement>('#motion-note')!.hidden = !motion.matches;
}
motion.addEventListener('change', syncMotion);
syncMotion();
