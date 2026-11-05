import { SOUNDTRACKS, randomSoundtrack, type SoundtrackId } from './soundtracks';
import { createMusicNoise, synthesizeNote, type MusicVoice } from './synth';
import { createMusicMix, MUSIC_GAIN, type MusicMix } from './music-mix';
import { musicLevel, nextEnergy, STEP_SECONDS, type FlowEvent, type MusicNote } from './composition';

/** Look-ahead Web Audio sequencer. Arrangement changes only at bar boundaries. */
export class FlowMusic {
  private context?: AudioContext;
  private mix?: MusicMix;
  private noise?: AudioBuffer;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<MusicVoice>();
  private soundtrack: SoundtrackId = 'neon-drive';
  private enabled = true;
  private playing = false;
  private muted = false;
  private energy = 0;
  private level = 0;
  private seed = 0;
  private bar = 0;
  private step = 0;
  private nextTime = 0;
  private phrase: MusicNote[] = [];
  private lastAnswer = 0;
  private lastDecay = 0;

  constructor(private getContext: () => AudioContext | undefined) {
    try { this.enabled = localStorage.getItem('seterraline:music') !== 'false'; } catch { /* Optional storage. */ }
    document.addEventListener('visibilitychange', () => this.sync());
  }

  get soundtrackId(): SoundtrackId { return this.soundtrack; }

  get isEnabled(): boolean { return this.enabled; }

  setEnabled(value: boolean): void {
    this.enabled = value;
    try { localStorage.setItem('seterraline:music', String(value)); } catch { /* Optional storage. */ }
    this.sync();
  }

  setMuted(value: boolean): void { this.muted = value; this.sync(); }
  setPlaying(value: boolean): void { this.playing = value; this.sync(); }
  unlock(): void { this.sync(); }

  reset(seed: number): void {
    this.stop(); this.soundtrack = randomSoundtrack(); this.seed = seed; this.energy = 0; this.level = 0; this.bar = 0; this.step = 0;
    this.lastAnswer = this.lastDecay = performance.now(); this.sync();
  }

  react(event: FlowEvent): void {
    this.energy = nextEnergy(this.energy, event);
    this.lastAnswer = this.lastDecay = performance.now();
  }

  private sync(): void {
    if (!this.enabled || this.muted || !this.playing || document.hidden) { this.stop(); return; }
    const ctx = this.getContext();
    if (!ctx || ctx.state === 'closed' || this.timer) return;
    if (!this.mix) {
      this.context = ctx;
      this.mix = createMusicMix(ctx);
      this.noise = createMusicNoise(ctx);
    }
    this.nextTime = ctx.currentTime + .04; this.step = 0;
    const gain = this.mix!.master.gain;
    gain.cancelScheduledValues(ctx.currentTime); gain.setValueAtTime(gain.value, ctx.currentTime); gain.linearRampToValueAtTime(MUSIC_GAIN, ctx.currentTime + .45);
    this.timer = setInterval(() => this.schedule(), 80); this.schedule();
  }

  private stop(): void {
    clearInterval(this.timer); this.timer = undefined;
    if (this.context && this.mix) {
      const now = this.context.currentTime, gain = this.mix.master.gain;
      gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); gain.linearRampToValueAtTime(0, now + .08);
      for (const voice of this.voices) { try { voice.stop(now + .09); } catch { /* Already stopped. */ } }
    }
  }

  private schedule(): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - this.lastAnswer > 18000 && now - this.lastDecay > 8000) { this.energy = Math.max(0, this.energy - 1); this.lastDecay = now; }
    if (this.nextTime < ctx.currentTime - .1) { this.nextTime = ctx.currentTime + .03; this.step = 0; }
    while (this.nextTime < ctx.currentTime + .18) {
      if (this.step === 0) { this.level = musicLevel(this.energy); this.phrase = SOUNDTRACKS[this.soundtrack].compose(this.seed, this.bar, this.level); }
      for (const note of this.phrase) if (note.step === this.step) this.note(note, this.nextTime, STEP_SECONDS);
      this.nextTime += STEP_SECONDS;
      this.step = (this.step + 1) % 16;
      if (!this.step) this.bar++;
    }
  }

  private note(note: MusicNote, start: number, stepLength: number): void {
    if (this.voices.size >= 64) return;
    const source = synthesizeNote(this.context!, this.mix!, this.noise!, note, start, stepLength, voice => this.voices.delete(voice));
    this.voices.add(source);
  }
}
