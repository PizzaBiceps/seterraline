import { random } from '../game/engine';
export type FlowEvent = { type: 'correct'; clean: boolean; elapsedMs: number } | { type: 'failed' | 'hint' | 'skip' };
export const musicLevel = (energy: number): number => Math.min(4, Math.max(0, Math.floor(energy / 3)));
export function nextEnergy(energy: number, event: FlowEvent): number {
  const gain = event.type === 'correct' ? event.clean ? event.elapsedMs <= 8000 ? 2.4 : 1.5 : .3 : event.type === 'hint' ? -1.5 : event.type === 'skip' ? -3 : -2.4;
  return Math.max(0, Math.min(14.9, energy + gain));
}

// Keep a straight, driving pulse when flow changes; no tempo jumps between levels.
export const MUSIC_BPM = 112;
export const STEP_SECONDS = 60 / MUSIC_BPM / 4;
export const stepOffset = (step: number): number => step * STEP_SECONDS;
export type Instrument = 'bass' | 'hard-bass' | 'buzz' | 'hard-lead' | 'arp' | 'pulse' | 'lead' | 'chord' | 'pad' | 'hat' | 'open-hat' | 'kick' | 'hard-kick' | 'snare' | 'rim';
export interface MusicNote { step: number; midi: number; length: number; velocity: number; instrument: Instrument; pan?: number }

// Am – F – C – G. Strong minor-key triads and octaves, with no jazzy extensions.
const CHORDS = [
  { root: 45, voices: [57, 60, 64, 69], hook: [81, 76, 72, 69] },
  { root: 41, voices: [57, 60, 65, 69], hook: [81, 77, 72, 69] },
  { root: 48, voices: [55, 60, 64, 67], hook: [79, 76, 72, 67] },
  { root: 43, voices: [55, 59, 62, 67], hook: [79, 74, 71, 67] },
];

/** A recurring hook, seeded phrase variations, and eight-bar call-and-response. */
export function composeBar(seed: number, bar: number, level: number): MusicNote[] {
  const rng = random((seed + Math.floor(bar / 8) * 7919) >>> 0), notes: MusicNote[] = [];
  const chord = CHORDS[bar % 4], answer = bar % 8 >= 4;
  const variation = Math.floor(rng() * 3);
  const add = (instrument: Instrument, step: number, midi: number, length: number, velocity: number, pan = 0) => notes.push({ instrument, step, midi, length, velocity, pan });

  // Motor-like eighth-note bass; octave lifts and pickups build momentum.
  const bassSteps = level === 0 ? [0, 4, 8, 12] : level < 4 ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 2, 4, 6, 8, 10, 12, 14, 15];
  for (const step of bassSteps) {
    const octave = step === 6 || step === 14 ? 12 : 0;
    const pickup = step === 15 ? (CHORDS[(bar + 1) % 4].root - chord.root) : 0;
    add('bass', step, chord.root + octave + pickup, level === 0 ? 2.7 : step === 15 ? .65 : 1.35, step % 4 ? .18 : .23);
  }
  chord.voices.forEach((midi, i) => add('pad', 0, midi, 16, .026, (i - 1.5) * .4));
  for (const step of level < 2 ? [0, 8] : [0, 6, 8, 14]) {
    chord.voices.forEach((midi, i) => add('chord', step, midi, step % 8 === 0 ? 3.5 : 1.1, step % 8 === 0 ? .047 : .03, (i - 1.5) * .22));
  }

  // The beat is present from the start, becoming more physical as layers unlock.
  for (const step of level === 0 ? [0, 8] : level < 3 ? [0, 4, 8, 12] : [0, 4, 8, 10, 12]) add('kick', step, 0, 1.8, step === 10 ? .22 : .3);
  for (const step of [4, 12]) add('snare', step, 0, 1.4, level === 0 ? .12 : .23);
  if (level >= 1) {
    for (let step = 0; step < 16; step += 2) add('hat', step, 0, .28, step % 4 ? .075 : .043, .25);
    if (level >= 3) for (const step of [3, 11, 15]) add('hat', step, 0, .2, .028, -.32);
    if (level >= 4) for (const step of [6, 14]) add('open-hat', step, 0, 1.2, .055, .35);
  }

  // Recognizable rather than a new random melody every bar. The second half answers.
  if (level >= 2) {
    const rhythm = answer ? [0, 4, 8, 12] : [0, 6, 8, 14];
    const order = variation === 0 ? [0, 1, 2, 1] : variation === 1 ? [0, 1, 0, 3] : [0, 2, 1, 3];
    rhythm.forEach((step, i) => add('lead', step, chord.hook[answer ? order[3 - i] : order[i]], i === 0 || i === 2 ? 4.7 : 1.5, i === 0 ? .115 : .09, -.08));
    if (level >= 4 && answer) add('lead', 15, chord.hook[0] + (bar % 2 ? 0 : 12), 1.6, .065, .16);
  }
  if (level >= 3) {
    const steps = level === 4 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] : [0, 2, 4, 6, 8, 10, 12, 14];
    steps.forEach((step, i) => add('arp', step, chord.voices[(i + variation + bar) % 4] + 24, .7, .038, i % 2 ? .6 : -.6));
  }
  // A small turnaround every four bars, a bigger one every eight; never constant fills.
  if (level >= 3 && bar % 4 === 3) {
    add('snare', 14, 0, .65, .075, -.2);
    if (level === 4 && bar % 8 === 7) {
      add('snare', 15, 0, .6, .11, .2);
      add('chord', 15, 84, 1.3, .04, -.4);
    }
  }
  return notes;
}
