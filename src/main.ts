import '@fontsource/silkscreen/latin-400.css';
import './style.css';
import { avatarPicker, avatarSvg } from './ui/avatar-picker';
import { dunceCap, showDunceSlots } from './ui/dunce-slots';
import { finishMedal } from './ui/finish-medal';
import { setPixelFlag } from './ui/pixel-flag';
import { FireCrackle } from './effects/fire-crackle';
import { PodiumFlames } from './effects/podium-flames';
import { StreakHeat } from './effects/streak';
import { ImpactEffects } from './effects/impact';
import { FlowMusic } from './effects/music';
import { ScoreDisplay } from './effects/score';
import { SoundEffects } from './effects/sound';
import { ClickEffects } from './effects/particles';
import { icon } from './icons';
import { playFaviconArrival, startFaviconLoading } from './ui/favicon';
import { compassSpinner, playCompassArrival } from './ui/compass-spinner';
import { saveBest } from './game/records';
import { PartyClient, partyAvailable } from './party/client';
import type { Standing } from './party/types';
import type { GameCommand } from './game/engine';
import { MODES } from './game/modes';
import { SeaMonsters } from './map/monsters';
import { AtlasRenderer, type Atlas } from './map/renderer';
import { createMatch, reduceMatch, currentStreak, eligible, score, accuracy, flagOptions, type Country, type Mode, type Region, type MatchState } from './game/engine';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const regions: Region[] = ['World', 'Europe', 'Africa', 'Asia', 'Americas', 'Oceania'];
let monsters: SeaMonsters;
let countries: Country[] = [], renderer: AtlasRenderer, state: MatchState;
let mode: Mode = 'countries', region: Region = 'World', rounds = 20;
let roundStart = 0, startedAt = 0, completedAt = 0, transition = false;
let roundPulse: Animation | undefined;
let resultEntrance: Animation | undefined;
let targetFailure: Animation | undefined;
let advanceTimer: ReturnType<typeof setTimeout> | undefined, flashTimer: ReturnType<typeof setTimeout> | undefined, feedbackTimer: ReturnType<typeof setTimeout> | undefined;

$('#app').innerHTML = `
<main class="game" aria-label="Geography quiz">
 <div class="map-stage" id="map-stage">
  <canvas id="map" tabindex="0" role="application" aria-label="Country map. Tap or click to answer. Drag to pan and pinch to zoom. Plus and minus zoom, arrow keys pan, and 0 resets the view. Use the keyboard button to select an answer." aria-describedby="target-name"></canvas>
  <div id="tooltip" class="tooltip" hidden></div>
 </div>
 <header class="toolbar">
  <button class="identity" type="button" aria-label="Spin compass" title="Spin compass"><span class="brand-mark" aria-hidden="true">${icon('compass', 32)}</span><strong>SETERRALINE</strong></button>
  <div class="header-actions"><button id="party" class="utility-button" title="Play with friends">${icon('party',20)}<span>PARTY</span></button><button id="settings" class="square-button" aria-label="Game menu" title="Game menu">${icon('menu', 18)}<span class="corner-label">MENU</span><span id="quiz-name" class="sr-only">World · Countries</span></button></div>
 </header>
 <section class="question" aria-label="Current question"><span id="prompt-label" class="sr-only">LOCATE</span><img id="target-flag" class="target-flag" alt="Flag to locate on the map" width="120" height="80" hidden><h1 id="target-name" aria-live="polite">Loading map</h1><span id="round-number" class="round-number">— / —</span><div class="progress-track"><div id="progress"></div></div></section>
 <aside id="party-activity" class="party-activity" aria-label="Live player activity" hidden></aside>
 <div id="egg-message" class="sr-only" role="status" aria-live="polite"></div>
 <div id="flag-board" class="flag-board" hidden></div>
 <div id="feedback" class="feedback" role="status" aria-live="polite" hidden></div>
 <div class="zoom-controls" role="group" aria-label="Map view"><button id="zoom-in" aria-label="Zoom in" title="Zoom in">${icon('zoom-in',24)}</button><button id="zoom-out" aria-label="Zoom out" title="Zoom out">${icon('zoom-out',24)}</button><button id="reset-view" aria-label="Reset map view" title="Reset map view">${icon('reset-view', 24)}<span>RESET</span></button></div>
 <footer class="game-footer"><div class="session-stats" aria-label="Score"><div class="hud-score"><span class="score-star" aria-hidden="true">${icon('score-map',28)}</span><div class="hud-readout"><span class="hud-label">POINTS</span><strong id="score">0</strong></div></div><div class="hud-clock">${icon('hourglass',20)}<div class="hud-readout"><span class="hud-label">TIME</span><time id="time" aria-label="Session time">00:00</time></div></div><span id="accuracy" class="sr-only">100%</span></div><div class="actions"><button id="hint" class="utility-button" aria-label="Hint" title="Hint · −50 points">${icon('bulb', 17)}<span>HINT</span></button><button id="skip" class="utility-button" aria-label="Skip" title="Skip">${icon('skip', 17)}<span>SKIP</span></button></div></footer>
 <div id="extra-controls" hidden><button id="sound" class="utility-button" aria-label="Mute sound" title="Mute sound" aria-pressed="true">${icon('sound', 17)}</button><button id="keyboard-answer" class="utility-button" aria-label="Answer using keyboard">${icon('keyboard', 17)}<span>Type answer</span></button><button id="restart" class="utility-button" aria-label="Restart round">${icon('reset', 17)}<span>New round</span></button><button id="help" class="utility-button" aria-label="How to play">${icon('help', 17)}<span>Controls</span></button></div>
 <div class="loading" id="loading" role="status">${compassSpinner(64)}<span>Loading map</span></div>
 <div id="load-error" class="error-panel" hidden></div>
 <section id="results" class="results" aria-label="Round results" hidden></section>
</main>
<dialog id="dialog"><button class="dialog-close icon-only" aria-label="Close dialog">${icon('close', 19)}</button><div id="dialog-body"></div></dialog>`;

const menuControls = ['#sound', '#keyboard-answer', '#restart', '#help'].map(selector => $(selector));
$('.identity').onclick = () => { if (playCompassArrival($('.brand-mark'))) void playFaviconArrival(true); };
const scoreDisplay = new ScoreDisplay($('#score'), $('.game'));
let streak = 0;
const streakHeat = new StreakHeat([$('#target-name'), $('#round-number'), $('#score')], $('.game'));
const sounds = new SoundEffects();
const music = new FlowMusic(() => sounds.audioContext);
music.setMuted(!sounds.enabled);
const impacts = new ImpactEffects($('.game'));
const effects = new ClickEffects($('.game'));
const fireAudio = new FireCrackle(()=>sounds.audioContext,()=>sounds.enabled);
const podiumFlames = new PodiumFlames($('.game'),active=>fireAudio.setActive(active));
let pointerStart = { x: 0, y: 0 }, lastPointer = { x: innerWidth / 2, y: innerHeight / 2, at: 0 };
function effectOrigin(): { x: number; y: number } { return performance.now() - lastPointer.at < 350 ? lastPointer : { x: innerWidth / 2, y: innerHeight / 2 }; }
document.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; sounds.unlock(); music.unlock(); fireAudio.sync(); }, { capture: true });
document.addEventListener('keydown', () => { sounds.unlock(); music.unlock(); fireAudio.sync(); }, { capture: true });
document.addEventListener('pointerup', event => {
 if (!event.isPrimary || renderer?.isTouchNavigation) return;
 if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > (event.pointerType === 'touch' ? 12 : 6)) return;
 lastPointer = { x: event.clientX, y: event.clientY, at: performance.now() };
 if (event.target === $('#map')) { effects.burst(event.clientX, event.clientY, 'click'); impacts.ring(event.clientX, event.clientY, 'click'); }
}, { capture: true });
function syncSoundButton(): void { const button = $('#sound'); button.innerHTML = icon(sounds.enabled ? 'sound' : 'muted', 17) + `<span>Sound ${sounds.enabled ? 'on' : 'off'}</span>`; button.setAttribute('aria-label', sounds.enabled ? 'Mute sound' : 'Enable sound'); button.setAttribute('title', sounds.enabled ? 'Mute sound' : 'Enable sound'); button.setAttribute('aria-pressed', String(sounds.enabled)); }
$('#sound').onclick = () => { sounds.toggle(); fireAudio.sync(); music.setMuted(!sounds.enabled); syncSoundButton(); if (sounds.enabled) sounds.play('hint'); };
syncSoundButton();

function openDialog(content: string): void { partyDialog = false; for (const control of menuControls) $('#extra-controls').append(control); $('#dialog-body').innerHTML = content; $<HTMLDialogElement>('#dialog').showModal(); }
function closeDialog(): void { for (const control of menuControls) $('#extra-controls').append(control); $<HTMLDialogElement>('#dialog').close(); }
$('.dialog-close').onclick = closeDialog;
$<HTMLDialogElement>('#dialog').addEventListener('click', event => { if (event.target !== event.currentTarget) return; const r = $<HTMLDialogElement>('#dialog').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); });
function formatTime(seconds: number): string { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function target(): Country { return countries.find(c => c.id === state.deck[Math.min(state.index, state.deck.length - 1)])!; }
function syncMap(flash: { id: string; kind: 'wrong' | 'hint' } | null = null): void { renderer.setState(new Set(eligible(countries, region).map(c => c.id)), new Set(state.answers.filter(a => a.correct).map(a => a.targetId)), flash); }
function feedback(message: string, kind: 'correct' | 'wrong' | 'hint', duration = 0): void {
 clearTimeout(feedbackTimer); $('#feedback').textContent = message; $('#feedback').className = `feedback ${kind}`; $('#feedback').hidden = false;
 if (duration) feedbackTimer = setTimeout(() => { $('#feedback').hidden = true; }, duration);
}
function startGame(seed = crypto.getRandomValues(new Uint32Array(1))[0]): void {
 if (party.snapshot) { partyMenu(); return; }
 resultEntrance?.cancel(); podiumFlames.stop(); renderer?.smolderBorders(0); $('#results').classList.remove('victory-result','podium-first','podium-second');
 targetFailure?.cancel();
 roundPulse?.cancel();
 clearTimeout(advanceTimer); clearTimeout(flashTimer); clearTimeout(feedbackTimer); transition = false; completedAt = 0; streak = 0; streakHeat.set(0); scoreDisplay.reset();
 state = createMatch({ mode, region, rounds, seed }, countries); startedAt = roundStart = performance.now(); music.reset(seed); music.setPlaying(true);
 $('#time').textContent = '00:00'; $('#results').hidden = true; $('#feedback').hidden = true; $('#tooltip').hidden = true;
 $('#quiz-name').textContent = `${region} · ${MODES[mode].title}`;
 $('.game').classList.toggle('flag-mode', mode === 'flags');
 $('.game').classList.toggle('flag-map-mode', mode === 'flag-map');
 $('#keyboard-answer').hidden = mode === 'flags'; $('.zoom-controls').hidden = mode === 'flags';
 renderer.focus(region); syncMap(); update();
}
function lockAnswers(locked: boolean): void {
 $<HTMLButtonElement>('#hint').disabled = locked || state.hinted || state.status === 'finished';
 $<HTMLButtonElement>('#skip').disabled = locked || state.status === 'finished';
 $<HTMLButtonElement>('#keyboard-answer').disabled = locked || state.status === 'finished';
 document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => { button.disabled = locked; });
}
function updateStats(): void { scoreDisplay.set(score(state)); $('#accuracy').textContent = `${accuracy(state)}%`; $('#progress').style.width = `${state.index / state.deck.length * 100}%`; }
function update(): void {
 targetFailure?.cancel(); targetFailure = undefined;
 updateStats(); $('#round-number').textContent = `${String(Math.min(state.index + 1, state.deck.length)).padStart(2, '0')} / ${state.deck.length}`;
 $('#target-name').textContent = MODES[mode].prompt(target()); $('#prompt-label').textContent = MODES[mode].surface === 'map' ? 'LOCATE' : 'IDENTIFY THE FLAG';
 const targetFlag = $<HTMLImageElement>('#target-flag');
 targetFlag.hidden = mode !== 'flag-map' || state.status === 'finished';
 if (!targetFlag.hidden) setPixelFlag(targetFlag, target().iso);
 $<HTMLButtonElement>('#hint').disabled = state.hinted || state.status === 'finished'; $<HTMLButtonElement>('#skip').disabled = state.status === 'finished';
 $('#hint').classList.toggle('used', state.hinted); $('#flag-board').hidden = mode !== 'flags';
 if (mode === 'flags' && state.status === 'playing') renderFlag();
 if (state.status === 'finished') finish();
 else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $('#target-name').animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'steps(4)' });
 lockAnswers(false);
}
function renderFlag(): void {
 const country = target(), options = flagOptions(country, eligible(countries, region), (party.snapshot ? 0 : state.config.seed) + state.index);
 $('#target-name').textContent = '';
 $('#flag-board').innerHTML = `<img class="quiz-flag" src="${import.meta.env.BASE_URL}flags/${country.iso}.svg" alt="Flag to identify" width="240" height="180"/><div class="flag-options">${options.map((c, i) => `<button data-answer="${c.id}"><kbd>${i + 1}</kbd>${escape(c.name)}</button>`).join('')}</div>`;
 setPixelFlag($<HTMLImageElement>('.quiz-flag'), country.iso);
 document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b => { b.onclick = () => guess(b.dataset.answer!); });
}
async function guess(id: string): Promise<void> {

 if (!state || state.status !== 'playing' || transition || partyBusy || (party.snapshot?.phase === 'lobby')) return;
 if (!eligible(countries, region).some(c => c.id === id)) { feedback('OUT OF BOUNDS', 'hint', 1000); return; }
 const current = target();
 if (MODES[mode].surface === 'map') sounds.play('map-click');
 if (!await applyCommand({ type: 'guess', countryId: id, elapsedMs: performance.now() - roundStart })) return;
 if (isFinished(state)) completedAt = performance.now();
 if (id === current.id) {
  roundPulse?.cancel();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) roundPulse = $('#round-number').animate([
   { transform: 'scale(1)' },
   { transform: 'scale(1.4)', offset: .35 },
   { transform: 'scale(1)' },
  ], { duration: 280, easing: 'cubic-bezier(.2,.8,.3,1)' });
  music.react({ type: 'correct', clean: state.answers.at(-1)!.points === 100, elapsedMs: state.answers.at(-1)!.elapsedMs });
  sounds.play('correct'); const origin = effectOrigin(); effects.burst(origin.x, origin.y, 'correct'); impacts.ring(origin.x, origin.y, 'correct');
  clearTimeout(flashTimer); streak = currentStreak(state);
  streakHeat.set(streak);
  transition = true; const earned = state.answers.at(-1)!.points;
  scoreDisplay.reward(earned, origin.x, origin.y, streak);
  $('#feedback').hidden = true; syncMap(); updateStats(); lockAnswers(true);
  if (mode === 'flags') document.querySelector<HTMLButtonElement>(`[data-answer="${id}"]`)?.classList.add('correct-answer');
  advanceTimer = setTimeout(() => { transition = false; roundStart = performance.now(); $('#feedback').hidden = true; update(); syncMap(); }, 700);
 } else {
  sounds.play('wrong'); const origin = effectOrigin(); effects.burst(origin.x, origin.y, 'wrong'); impacts.ring(origin.x, origin.y, 'wrong');
  feedback(`MISS ${state.attempts}/3`, 'wrong', 850); syncMap({ id, kind: 'wrong' });
  document.querySelector<HTMLButtonElement>(`[data-answer="${id}"]`)?.classList.add('wrong-answer');
  if (state.answers.at(-1)?.targetId === current.id && state.answers.at(-1)?.failed) {
   streak = currentStreak(state); streakHeat.set(streak);
   music.react({ type: 'failed' });
   clearTimeout(flashTimer);
   feedback('3 MISSES · NEXT', 'wrong');
   targetFailure = impacts.fail($('#target-name'));
   transition = true; updateStats(); lockAnswers(true);
   advanceTimer = setTimeout(() => { transition = false; roundStart = performance.now(); $('#feedback').hidden = true; update(); syncMap(); }, 450);
   return;
  }
  impacts.miss($('#target-name'));
  clearTimeout(flashTimer); flashTimer = setTimeout(() => syncMap(state.hinted ? { id: target().id, kind: 'hint' } : null), 800);
 }
}
$('#hint').onclick = async () => {
 if (!state || transition || partyBusy || party.snapshot?.phase === 'lobby' || state.status !== 'playing' || state.hinted) return;
 if (!await applyCommand({ type: 'hint' })) return;
 music.react({ type: 'hint' });
 sounds.play('hint'); streak = 0; streakHeat.set(0);
 if (MODES[mode].surface === 'map') { if (region === 'World') renderer.focus(target().region as Region); syncMap({ id: target().id, kind: 'hint' }); feedback('HINT −50', 'hint', 1300); }
 else feedback(target().name, 'hint');
 $<HTMLButtonElement>('#hint').disabled = true; $('#hint').classList.add('used');
};
$('#skip').onclick = async () => {
 if (!state || transition || partyBusy || party.snapshot?.phase === 'lobby' || state.status !== 'playing') return;
 const current = target();
 if (!await applyCommand({ type: 'skip', elapsedMs: performance.now() - roundStart })) return;
 music.react({ type: 'skip' });
 sounds.play('skip'); streak = 0; streakHeat.set(0); clearTimeout(flashTimer);
 transition = true; lockAnswers(true);
 if (isFinished(state)) completedAt = performance.now();
 feedback(current.name, 'hint'); syncMap({ id: current.id, kind: 'hint' });
 if (MODES[mode].surface === 'map' && region === 'World') renderer.focus(current.region as Region);
 advanceTimer = setTimeout(() => { transition = false; roundStart = performance.now(); $('#feedback').hidden = true; update(); syncMap(); }, 1400);
};
function animatePodium(place = 1): void {
 resultEntrance?.cancel(); const panel=$('#results'); panel.getAnimations().forEach(animation=>animation.cancel());
 if (matchMedia('(prefers-reduced-motion: reduce)').matches) { resultEntrance=panel.animate([{opacity:0},{opacity:1}],{duration:160});return; }
 const strength=place===2?7:12;
 const pose=(x:number,y:number,scale:number)=>`translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
 const frames:Keyframe[]=[{transform:pose(0,64,.88),offset:0},{transform:pose(0,-4,1.035),offset:.18},{transform:pose(0,0,1),offset:.24}];
 for(let i=0;i<23;i++){
  const decay=(1-i/23)**1.3,x=Math.round((i%2?1:-1)*strength*decay),y=Math.round(Math.sin(i*2.3)*strength*.35*decay);
  frames.push({transform:pose(x,y,1),offset:.25+i/23*.7,easing:'steps(1)'});
 }
 frames.push({transform:pose(0,0,1),offset:1});resultEntrance=panel.animate(frames,{duration:1100,easing:'linear'});
}
function finish(): void {
 streakHeat.set(0);
 music.setPlaying(false);
 sounds.play('complete'); effects.burst(innerWidth * .35, innerHeight * .4, 'complete'); effects.burst(innerWidth * .65, innerHeight * .4, 'complete');
 const elapsedMs = (completedAt || performance.now()) - startedAt;
 const elapsed = Math.floor(elapsedMs / 1000); $('#time').textContent = formatTime(elapsed);
 const points = score(state);
 let recordStorage: Storage | undefined;
 try { recordStorage = localStorage; } catch { /* Storage is optional. */ }
 const record = party.snapshot ? undefined : saveBest(recordStorage, state.config, { points, elapsedMs });
 const finisher = party.snapshot?.players.find(p => p.id === party.snapshot!.you);
 $('#results').classList.toggle('podium-first',finisher?.finishPlace===1);
 $('#results').classList.toggle('podium-second',finisher?.finishPlace===2);
 const medalMarkup = finishMedal(finisher?.finishPlace);
 const capMarkup = finisher?.dunceHat ? dunceCap() : '';
 const bestMarkup = record ? `<p class="personal-best">${record.isNew ? 'NEW PERSONAL BEST' : 'PERSONAL BEST'}<span>${record.best.points.toLocaleString()} PTS · ${formatTime(Math.floor(record.best.elapsedMs / 1000))}</span></p>` : '';
 $('#target-name').textContent = ''; $('#prompt-label').textContent = 'FINISHED'; $('#round-number').textContent = `${state.index} / ${state.deck.length}`;
 $('#flag-board').hidden = true; $('#target-flag').hidden = true; $('#results').hidden = false;
 const missed = state.answers.filter(a => a.points < 100).map(a => countries.find(c => c.id === a.targetId)!.name);
 const rating = accuracy(state) === 100 ? 'S' : accuracy(state) >= 90 ? 'A' : accuracy(state) >= 75 ? 'B' : accuracy(state) >= 50 ? 'C' : 'D';
 $('#results').innerHTML = `${capMarkup}${medalMarkup ? `<div class="medal-award">${medalMarkup}<strong>${finisher!.finishPlace === 1 ? '1ST' : '2ND'} TO FINISH</strong></div>` : ''}${party.snapshot ? '' : `<div class="clear-emblem" aria-label="Rank ${rating}"><span>${rating}</span>${icon('star',16)}${icon('star',16)}${icon('star',16)}</div>`}<h2>${party.snapshot?.players.find(p => p.id === party.snapshot!.you)?.timedOut ? 'TIME UP' : party.snapshot?.players.find(p => p.id === party.snapshot!.you)?.stopped ? 'ROUND ENDED' : party.snapshot ? 'YOUR RUN FINISHED' : 'STAGE CLEAR'}</h2><div class="result-score"><strong>${points.toLocaleString()}</strong><span>POINTS</span></div><div class="result-stats"><div><strong>${accuracy(state)}%</strong><span>Accuracy</span></div><div><strong>${formatTime(elapsed)}</strong><span>Time</span></div></div>${party.snapshot?.phase === 'playing' ? '<p class="party-summary">Your score is in. Watch the live standings while the round continues.</p>' : ''}${bestMarkup}${missed.length ? `<details><summary>Review ${missed.length} countries</summary><p>${missed.map(escape).join(' · ')}</p></details>` : state.index === state.deck.length ? '<p class="perfect-round">PERFECT RUN</p>' : ''}${party.snapshot ? '<div id="party-result-board"></div><div id="party-result-actions"></div>' : `<div class="result-actions"><button class="primary-button" id="play-again">NEXT ${icon('arrow',16)}</button><button class="secondary-button" id="same-round" aria-label="Replay same round">${icon('reset',16)}</button></div><button class="text-button" id="result-settings">SETUP</button>`}`;
 if (!party.snapshot && !matchMedia('(prefers-reduced-motion: reduce)').matches) $('#results').animate([{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:240,easing:'steps(5)'});

 if (finisher?.finishPlace===1 || finisher?.finishPlace===2) { animatePodium(finisher.finishPlace); podiumFlames.play($('#results'),finisher.finishPlace); }
 celebrateWinner();
 if (party.snapshot) updatePartyResults();
 else { $('#play-again').onclick = () => startGame(); $('#same-round').onclick = () => startGame(state.config.seed); $('#result-settings').onclick = settings; }
}
function settings(): void {
 if (party.snapshot) { partyMenu(); return; }
 if (!state) return;
 openDialog(`<h2>SETUP</h2><form id="settings-form"><fieldset class="map-choices"><legend>CHOOSE MAP</legend>${regions.map(r => `<label class="map-choice"><input type="radio" name="region" value="${r}" ${r === region ? 'checked' : ''} required><span><strong>${r}</strong><small>${eligible(countries, r).length} countries</small></span></label>`).join('')}</fieldset><label for="mode">Mode</label><select id="mode">${Object.values(MODES).map(definition => `<option value="${definition.id}" ${mode === definition.id ? 'selected' : ''}>${definition.title}</option>`).join('')}</select><label for="rounds">Countries</label><select id="rounds"><option value="10" ${rounds === 10 ? 'selected' : ''}>10</option><option value="20" ${rounds === 20 ? 'selected' : ''}>20</option><option value="0" ${rounds === 0 ? 'selected' : ''}>All</option></select><button type="submit" class="primary-button">PLAY</button></form><div id="settings-tools" class="settings-tools"></div>`);
 for (const control of menuControls) $('#settings-tools').append(control);
 $<HTMLFormElement>('#settings-form').onsubmit = event => { event.preventDefault(); region = new FormData($<HTMLFormElement>('#settings-form')).get('region') as Region; mode = $<HTMLSelectElement>('#mode').value as Mode; rounds = Number($<HTMLSelectElement>('#rounds').value); closeDialog(); syncParty(); startGame(); };
}
$('#settings').onclick = settings;
$('#restart').onclick = () => {
 if (party.snapshot) { partyMenu(); return; }
 if (!state) return;
 if (!state.index && !state.attempts && !state.hinted || state.status === 'finished') { startGame(); return; }
 openDialog('<h2>RESTART?</h2><p>Your current score will be reset.</p><div class="dialog-actions"><button class="primary-button" id="confirm-restart">Restart</button><button class="secondary-button" id="cancel-restart">Cancel</button></div>');
 $('#confirm-restart').onclick = () => { closeDialog(); startGame(); }; $('#cancel-restart').onclick = closeDialog;
};
$('#help').onclick = () => openDialog(`<h2>CONTROLS</h2><p>Click the country shown above the map. In Flag → Map, locate the country that matches the flag. In Flags, choose the matching country name.</p><p><strong>Scoring:</strong> 100 points per country. Wrong guesses cost 25 points; a hint costs 50. Three wrong guesses automatically skip to the next country for 0 points. Earlier correct answers earn at least 25 points. Skips earn 0. Personal bests rank points first, then fastest time, separately for each mode, map, and round length. Accuracy is points earned as a percentage of the maximum.</p><p><strong>Map:</strong> Pinch or scroll to zoom; drag to pan. Dots mark small countries. Tapping a crowded area zooms in without spending a guess; tap again to answer. Use the keyboard button to choose an answer from a list.</p><p><strong>Shortcuts:</strong> Focus the map, then use + / − to zoom, arrows to pan, and 0 to reset. In flag mode, answer with 1–4.</p>`);
$('#zoom-in').onclick = () => renderer?.zoomBy(1.5); $('#zoom-out').onclick = () => renderer?.zoomBy(1 / 1.5); $('#reset-view').onclick = () => renderer?.focus(region);
$('#keyboard-answer').onclick = () => {
 if (!state || transition || partyBusy || party.snapshot?.phase === 'lobby' || state.status !== 'playing') return;
 openDialog(`<h2>${mode === 'flag-map' ? 'Locate this flag' : `Find ${escape(target().name)}`}</h2><form id="answer-form"><label for="country-answer">Country</label><select id="country-answer" required><option value="">Select…</option>${eligible(countries, region).sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('')}</select><button type="submit" class="primary-button">Answer</button></form>`);
 $<HTMLFormElement>('#answer-form').onsubmit = event => { event.preventDefault(); const id = $<HTMLSelectElement>('#country-answer').value; if (id) { closeDialog(); guess(id); } }; $<HTMLSelectElement>('#country-answer').focus();
};
document.addEventListener('keydown', event => { if (mode === 'flags' && !$('#dialog').hasAttribute('open') && ['1','2','3','4'].includes(event.key)) document.querySelectorAll<HTMLButtonElement>('[data-answer]')[Number(event.key) - 1]?.click(); });

setInterval(() => { if (state && !completedAt && !document.hidden) $('#time').textContent = formatTime(Math.floor((performance.now() - startedAt) / 1000)); }, 1000);
const party = new PartyClient();
let celebratedGame = '', spunGame = '';
let partyBusy = false, partyGame = -1, partyPolling = false;
let partyDialog = false, partyMarkup = '';
function partyError(error: unknown): void { feedback(error instanceof Error ? error.message : 'Connection lost. Try again.', 'hint', 5000); }
function isFinished(match: MatchState): boolean { return match.status === 'finished'; }
async function applyCommand(command: GameCommand): Promise<boolean> {
 if (!party.snapshot) { state = reduceMatch(state, command); return true; }
 if (partyBusy || party.snapshot.phase === 'lobby') return false;
 partyBusy = true; lockAnswers(true);
 try {
  await party.action({ type: 'command', command, revision: state.revision, game: party.snapshot.game });
  state = party.snapshot!.state!; renderActivity(); return true;
 } catch (error) {
  if (!party.snapshot) { partyDialog=false; closeDialog(); syncParty(); startGame(); partyError(error); return false; }
  try { await party.refresh(); if (party.snapshot?.state) { state = party.snapshot.state; update(); syncMap(); } } catch { /* Keep state until reconnect. */ }
  partyError(error); return false;
 } finally { partyBusy = false; lockAnswers(false); }
}
function partyLink(): string { const url = new URL(location.href); url.searchParams.set('room', party.snapshot!.code); return url.href; }
function syncParty(): void {
 const room = party.snapshot;
 $('#party-activity').hidden = !room; $('.game').classList.toggle('in-party', !!room);
 if (!room) return;
 renderActivity();
 if (room.state && room.game !== partyGame) {
  partyGame = room.game; mode = room.config.mode; region = room.config.region; rounds = room.config.rounds;
  // Reuse presentation initialization, then replace the temporary local state.
  party.snapshot = undefined; startGame(); party.snapshot = room;
  state = room.state; startedAt = performance.now() - (room.serverTime - room.startedAt); completedAt = 0;
  if (state.status === 'finished') completedAt = startedAt + room.players.find(p => p.id === room.you)!.elapsedMs;
  update(); syncMap();
  if (partyDialog) { closeDialog(); partyDialog = false; }
 }
 if (room.state?.status === 'finished' && state.status !== 'finished') {
  clearTimeout(advanceTimer); clearTimeout(flashTimer); transition = false;
  state = room.state; completedAt = startedAt + room.players.find(p => p.id === room.you)!.elapsedMs; update(); syncMap();
 }
 if (partyDialog) renderRoom();
 celebrateWinner();
}
function celebrateWinner(): void {
 const room = party.snapshot;
 if (!room || room.phase !== 'finished' || document.hidden) return;
 const summary = document.querySelector('#results .party-summary'); if (summary) summary.textContent = 'Final scores are in.';
 const spinKey = `${room.code}:${room.game}`;
 let spinSeen=false; try { spinSeen=sessionStorage.getItem(`party:spin:${spinKey}`)==='1'; } catch { /* Optional storage. */ }
 if (room.loserId === room.you && spunGame !== spinKey && !spinSeen) { spunGame = spinKey; try { sessionStorage.setItem(`party:spin:${spinKey}`,'1'); } catch { /* Optional storage. */ } showDunceSlots(!!room.players.find(p=>p.id===room.you)?.dunceHat); }
 if ((room.winnerId || room.players[0]?.id) !== room.you) return;
 const key = `${room.code}:${room.game}`; if (celebratedGame === key) return;
 celebratedGame = key;
 $('#results h2').textContent = 'VICTORY'; animatePodium(1);
 renderer.smolderBorders(Infinity); podiumFlames.play($('#results'),1); music.playVictory();
 feedback('VICTORY · TOP SCORE', 'correct', 8000);
 $('#results').classList.add('victory-result');
}
function standingStatus(player: Standing): string {
 if (player.timedOut) return 'Timed out';
 if (player.stopped) return 'Round ended';
 if (player.finished) return 'Finished';
 if (player.presence === 'offline') return 'Offline';
 if (player.presence === 'away') return 'Away';
 return party.snapshot?.phase === 'lobby' ? 'In lobby' : 'Playing';
}
function updatePartyResults(): void {
 const room=party.snapshot, board=document.querySelector('#party-result-board'), actions=document.querySelector('#party-result-actions');
 if (!room || !board || !actions) return;
 const markup=`<h3>${room.phase==='finished' ? 'FINAL SCORES' : 'LIVE SCORES'}</h3><ol class="result-leaderboard">${room.players.map(p=>`<li>${avatarSvg(p.avatar)}<span>${escape(p.name)}${p.id===room.you ? ' (you)' : ''}${finishMedal(p.finishPlace)}${p.dunceHat ? dunceCap() : ''}</span><strong>${p.points}</strong></li>`).join('')}</ol>`;
 if (board.innerHTML!==markup)board.innerHTML=markup;
 const buttons=room.phase==='finished' && room.you===room.hostId ? '<button id="party-result-rematch" class="primary-button">REMATCH</button>' : '';
 if (actions.innerHTML!==buttons) { actions.innerHTML=buttons; const replay=document.querySelector<HTMLButtonElement>('#party-result-rematch'); if(replay)replay.onclick=async()=>{replay.disabled=true;partyBusy=true;try{await party.action({type:'start'});syncParty();}catch(error){partyError(error);replay.disabled=false;}finally{partyBusy=false;}}; }
}
function renderActivity(): void {
 updatePartyResults();
 const room = party.snapshot; if (!room) return;
 const markup = `<div class="activity-players">${room.players.filter(p=>p.id!==room.you).map((p,i) => {
  const guessed = !!p.lastGuessAt && room.serverTime-p.lastGuessAt < 4500;
  return `<button type="button" class="activity-avatar ${guessed ? p.lastGuessCorrect ? 'guess-correct' : 'guess-wrong' : ''}" style="--avatar-hue:${(i*73+165)%360}" data-presence="${p.finished ? 'finished' : p.presence || 'active'}" aria-label="${escape(p.name)}: ${p.points} points${guessed ? ', just guessed' : ''}. Open standings" title="${escape(p.name)} · ${p.points} PTS">${avatarSvg(p.avatar)}<span class="avatar-points">${p.points}</span><i class="activity-dot" aria-hidden="true"></i>${guessed ? `<span class="guess-flash" aria-hidden="true">${p.lastGuessCorrect ? '✓' : '×'}</span>` : ''}${finishMedal(p.finishPlace)}${p.dunceHat ? dunceCap() : ''}</button>`;
 }).join('')}</div>`;
 if ($('#party-activity').innerHTML !== markup) $('#party-activity').innerHTML = markup;
}
$('#party-activity').onclick = () => partyMenu();
document.addEventListener('visibilitychange',()=>{if(!document.hidden && !$('#results').hidden && $('#results').classList.contains('victory-result'))renderer.smolderBorders(Infinity);});
function renderRoom(): void {
 const room = party.snapshot!;
 const pending = room.players.filter(p => !p.finished && !p.stopped).length;
 const markup = `<h2>${room.phase === 'lobby' ? 'PARTY' : room.phase === 'finished' ? 'FINAL STANDINGS' : 'LIVE STANDINGS'}</h2><p>${escape(room.config.region)} · ${MODES[room.config.mode].title} · ${room.config.rounds || 'All'} countries</p><p>${room.players.length}/8 players · ${room.phase === 'lobby' ? 'Waiting for the host' : 'Points first, then fastest finish'}</p><ol class="party-standings">${room.players.map(p => `<li><span>${finishMedal(p.finishPlace)}${p.dunceHat ? dunceCap() : ''}${escape(p.name)}${p.id === room.you ? ' (you)' : ''}${p.id === room.hostId ? ' ★' : ''}</span><strong>${p.points} PTS</strong><small>${standingStatus(p)} · ${p.completed}/${room.total || '—'} answered${p.finished ? ' · ' + formatTime(Math.floor(p.elapsedMs / 1000)) : ''}</small>${p.id !== room.you ? `<button type="button" class="vote-kick text-button" data-kick="${p.id}" ${p.votedToKick ? 'disabled' : ''}>${p.votedToKick ? 'VOTED' : 'VOTE TO REMOVE'} · ${p.kickVotes || 0}/${Math.floor((room.players.length-1)/2)+1}</button>` : ''}</li>`).join('')}</ol>${room.phase === 'playing' ? `<p class="party-summary">${room.players.length - pending}/${room.players.length} finished · Live scores</p>` : ''}<label for="invite-link">Invite link</label><input id="invite-link" readonly value="${escape(partyLink())}"><button id="copy-invite" class="secondary-button">COPY LINK</button><p id="party-status" role="status"></p>${room.you === room.hostId && room.phase !== 'playing' ? `<button id="party-start" class="primary-button" ${room.players.length < 2 ? 'disabled' : ''}>${room.phase === 'finished' ? 'REMATCH' : 'START GAME'}</button>` : ''}${room.you === room.hostId && room.phase === 'playing' ? '<button id="party-end" class="secondary-button">END ROUND</button>' : ''}<button id="party-leave" class="text-button">LEAVE ROOM</button><div id="party-tools" class="settings-tools"></div><p>Invites expire after 24 hours. Keep this tab to reconnect.</p>`;
 if (partyMarkup === markup && document.querySelector('#party-tools')) return;
 partyMarkup = markup;
 for (const control of menuControls) $('#extra-controls').append(control);
 $('#dialog-body').innerHTML = markup;
 for (const control of menuControls.filter(c => c.id !== 'restart')) $('#party-tools').append(control);
 $('#copy-invite').onclick = async () => { try { await navigator.clipboard.writeText(partyLink()); $('#party-status').textContent = 'Link copied'; } catch { $<HTMLInputElement>('#invite-link').select(); $('#party-status').textContent = 'Select and copy the link above'; } };
 document.querySelectorAll<HTMLButtonElement>('[data-kick]').forEach(button => { button.onclick = async () => { button.disabled = true; partyBusy = true; try { await party.action({ type: 'vote-kick', playerId: button.dataset.kick }); syncParty(); } catch (error) { partyError(error); button.disabled=false; } finally { partyBusy=false; } }; });
 const end = document.querySelector<HTMLButtonElement>('#party-end');
 if (end) end.onclick = () => {
  openDialog('<h2>END THIS ROUND?</h2><p>Current scores will be kept. Unfinished players will be marked Round ended. You can then start a rematch.</p><button id="confirm-party-end" class="primary-button">END ROUND</button><button id="cancel-party-end" class="secondary-button">KEEP PLAYING</button>');
  $('#cancel-party-end').onclick = () => partyMenu();
  $('#confirm-party-end').onclick = async () => { partyBusy = true; try { await party.action({ type: 'end' }); syncParty(); partyMenu(); } catch (error) { partyError(error); } finally { partyBusy = false; } };
 };
 const start = document.querySelector<HTMLButtonElement>('#party-start');
 if (start) start.onclick = async () => { partyBusy = true; start.disabled = true; try { await party.action({ type: 'start' }); syncParty(); } catch (error) { partyError(error); start.disabled = false; } finally { partyBusy = false; } };
 $('#party-leave').onclick = async () => { partyBusy = true; try { await party.action({ type: 'leave' }); } catch (error) { partyBusy = false; partyError(error); return; } partyBusy = false; party.clear(); partyGame = -1; partyDialog = false; const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url); closeDialog(); syncParty(); startGame(); };
}
function partyMenu(code?: string): void {
 if (party.snapshot) { openDialog(''); partyDialog = true; renderRoom(); return; }
 openDialog(`<h2>${code ? 'JOIN PARTY' : 'PARTY'}</h2><p>${code ? 'Join this private room.' : 'Create a private room for 2–8 players using your current map, mode and round length.'}</p>${partyAvailable ? '<form id="party-form"><label for="nickname">Nickname</label><input id="nickname" maxlength="24" required autocomplete="nickname"><div id="avatar-picker" class="avatar-picker"></div><button class="primary-button" type="submit">' + (code ? 'JOIN ROOM' : 'CREATE INVITE') + '</button><p id="party-status" role="status"></p></form>' : '<p>Online rooms are not available on this site yet. Please try again later.</p>'}`);
 const picker = document.querySelector<HTMLElement>('#avatar-picker');
 const chosenAvatar = picker ? avatarPicker(picker) : undefined;
 const form = document.querySelector<HTMLFormElement>('#party-form');
 if (form) form.onsubmit = async event => { event.preventDefault(); const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; button.disabled = true; try { await party.enter($<HTMLInputElement>('#nickname').value, { mode, region, rounds, seed: 0 }, code, chosenAvatar?.()); const url = new URL(location.href); url.searchParams.set('room', party.snapshot!.code); history.replaceState(null, '', url); partyMenu(); syncParty(); } catch (error) { $('#party-status').textContent = error instanceof Error ? error.message : 'Could not connect'; button.disabled = false; } };
}
$('#party').onclick = () => partyMenu(new URL(location.href).searchParams.get('room') || undefined);
$<HTMLDialogElement>('#dialog').addEventListener('close', () => { partyDialog = false; });
async function restoreParty(): Promise<void> {
 const code = new URL(location.href).searchParams.get('room'); if (!code) return;
 if (!/^[a-f0-9]{16}$/.test(code)) { partyError(new Error('Invalid invite link.')); return; }
 if (await party.restore(code)) { partyMenu(); syncParty(); } else partyMenu(code);
}
setInterval(async () => {
 if (!party.snapshot || partyBusy || partyPolling || document.hidden) return;
 partyPolling = true;
 try { await party.refresh(); syncParty(); } catch (error) { if (!party.snapshot) { partyDialog = false; closeDialog(); syncParty(); startGame(); } partyError(error); } finally { partyPolling = false; }
}, 3000);
async function boot(): Promise<void> {
 const stopFaviconLoading = startFaviconLoading();
 try {
  const response = await fetch(`${import.meta.env.BASE_URL}data/countries.json`); if (!response.ok) throw new Error('The map could not be loaded.');
  const atlas: Atlas = await response.json(); countries = atlas.features.map(f => ({ id: String(f.id), ...f.properties }));
  const terrain = new Image(); terrain.src = `${import.meta.env.BASE_URL}data/pixel-terrain.png`; await terrain.decode();
  renderer = new AtlasRenderer($<HTMLCanvasElement>('#map'), atlas, terrain); renderer.onPick = guess;
  renderer.onCountryTap = () => { if (state?.status === 'playing' && !transition) sounds.play('map-click'); };
  monsters = new SeaMonsters($('.map-stage'), renderer, (kind, x, y) => {
    sounds.play(kind); effects.burst(x, y, kind === 'dragon' ? 'fire' : kind === 'kraken' ? 'ink' : 'water');
    $('#egg-message').textContent = kind === 'dragon' ? 'Here be dragons! A friendly dragon breathes pixel fire.' : kind === 'kraken' ? 'You found the kraken! An ink cloud erupts.' : 'You found the leviathan! It sings a secret melody.';
  });
  renderer.onViewChange = () => monsters.update();
  renderer.onInspect = (x, y) => {
    if (MODES[mode].surface !== 'map' || state.status !== 'playing' || transition) return;
    renderer.inspectAt(x, y);
  };
  document.addEventListener('keydown', event => { if (event.key === 'Escape') renderer.cancelGesture(); });
  renderer.onHover = (id, x, y) => { const tip = $('#tooltip'); tip.hidden = !id || transition || mode === 'flags' || state?.status === 'finished' || !state?.answers.some(a => a.targetId === id && a.correct); if (id) { tip.textContent = state?.answers.some(a => a.targetId === id && a.correct) ? countries.find(c => c.id === id)!.name : 'Click to guess'; tip.style.left = `${Math.max(8, Math.min(x + 15, innerWidth - 135))}px`; tip.style.top = `${Math.max(125, y - 36)}px`; } };
  renderer.onContextLost = () => { $('#load-error').hidden = false; $('#load-error').innerHTML = '<h2>Map connection lost</h2><p>Reload to restore the map, or continue with keyboard answers.</p><button class="primary-button" onclick="location.reload()">Reload</button>'; };
  stopFaviconLoading();
  $('#loading').hidden = true; startGame(); void restoreParty(); playCompassArrival($('.brand-mark')); void playFaviconArrival();
 } catch (error) {
  stopFaviconLoading();
  $('#loading').hidden = true; $('#target-name').textContent = 'Map unavailable'; $('#load-error').hidden = false;
  $('#load-error').innerHTML = `<h2>Couldn’t load the map</h2><p>${escape(error instanceof Error ? error.message : 'Please refresh to try again.')}</p><button class="primary-button" id="retry-load">Retry</button>`; $('#retry-load').onclick = () => location.reload();
 }
}
void boot();
