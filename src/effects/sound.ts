export type SoundCue = 'map-click' | 'correct' | 'wrong' | 'hint' | 'skip' | 'complete' | 'dragon' | 'kraken' | 'leviathan';

/** Short synthesized effects: no downloads, autoplay, or background audio. */
export class SoundEffects {
  private context?: AudioContext;
  private output?: GainNode;
  private voices = new Set<OscillatorNode>();
  private muted = false;
  private lastCueAt = 0;
  private lastClickAt = 0;

  constructor() {
    try { this.muted = localStorage.getItem('seterraline:muted') === 'true'; } catch { /* Optional storage. */ }
  }

  get audioContext(): AudioContext | undefined { return this.context; }

  get enabled(): boolean { return !this.muted; }

  unlock(): void {
    if (this.muted) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = .12;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Audio support must never prevent play. */ }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem('seterraline:muted', String(this.muted)); } catch { /* Optional storage. */ }
    if (this.muted) {
      for (const voice of this.voices) { try { voice.stop(); } catch { /* Already stopped. */ } }
      this.voices.clear();
    } else this.unlock();
    return this.enabled;
  }

  play(cue: SoundCue): void {
    const click = cue === 'map-click', now = performance.now();
    // A tactile click must never suppress the answer cue delivered on the same input.
    if (this.muted || document.hidden || now - (click ? this.lastClickAt : this.lastCueAt) < 55) return;
    this.unlock();
    if (!this.context || !this.output || this.context.state === 'closed') return;
    if (click) this.lastClickAt = now; else this.lastCueAt = now;
    const patterns: Record<SoundCue, [number, number, number][]> = {
      'map-click': [[1100, 0, .035]],
      dragon: [[130.81,0,.2],[164.81,.1,.22],[261.63,.2,.3]],
      kraken: [[110,0,.13],[146.83,.12,.15],[98,.25,.25]],
      leviathan: [[523.25,0,.22],[783.99,.17,.28],[659.25,.36,.3],[1046.5,.55,.4]],
      correct: [[659.25, 0, .13], [987.77, .075, .2]],
      wrong: [[196, 0, .09], [164.81, .07, .11]],
      hint: [[440, 0, .11], [587.33, .09, .16]],
      skip: [[392, 0, .08], [293.66, .07, .12]],
      complete: [[523.25, 0, .15], [659.25, .11, .15], [783.99, .22, .15], [1046.5, .34, .35]],
    };
    const ctx = this.context;
    for (const [frequency, delay, length] of patterns[cue]) {
      if (this.voices.size >= 20) break;
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
      oscillator.type = click || cue === 'wrong' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (click) oscillator.frequency.exponentialRampToValueAtTime(420, start + length);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(click ? .24 : .65, start + (click ? .001 : .006));
      envelope.gain.exponentialRampToValueAtTime(.001, start + length);
      oscillator.connect(envelope); envelope.connect(this.output);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(start); oscillator.stop(start + length + .02);
    }
  }
}
