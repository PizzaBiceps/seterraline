import { composeBar, type MusicNote } from './composition';
import { random } from '../game/engine';

export type SoundtrackId = 'neon-drive' | 'vector-run';

/** Brighter arcade electro: D minor, clipped hooks, a broken beat, and cycling octaves. */
export function composeVectorBar(seed: number, bar: number, level: number): MusicNote[] {
  const notes: MusicNote[] = [];
  const chords = [
    { root: 38, notes: [62, 65, 69], hook: [74, 77, 81, 77] },
    { root: 34, notes: [62, 65, 70], hook: [74, 77, 82, 77] },
    { root: 41, notes: [60, 65, 69], hook: [72, 77, 81, 77] },
    { root: 36, notes: [60, 64, 67], hook: [72, 76, 79, 76] },
  ];
  const chord = chords[bar % 4], answer = bar % 8 >= 4;
  const variation = Math.floor(random((seed + Math.floor(bar / 8) * 3571) >>> 0)() * 3);
  const add = (instrument: MusicNote['instrument'], step: number, midi: number, length: number, velocity: number, pan = 0) => notes.push({instrument, step, midi, length, velocity, pan});
  const bassSteps = level === 0 ? [0, 6, 8, 14] : [0, 2, 3, 6, 8, 10, 11, 14];
  bassSteps.forEach((step, i) => add('bass', step, chord.root + (i % 3 === 2 ? 12 : 0), 1.1, step % 4 ? .18 : .23));
  chord.notes.forEach((note, i) => add('pad', 0, note, 16, .025, (i - 1) * .5));
  // Offbeat synth stabs leave space around the bass and kick.
  for (const step of level < 2 ? [2, 10] : [2, 6, 10, 14]) {
    chord.notes.forEach((note, i) => add('chord', step, note, 1.1, .045, (i - 1) * .25));
  }
  for (const step of level === 0 ? [0, 8] : level < 3 ? [0, 6, 8, 14] : [0, 3, 6, 8, 11, 14]) add('kick', step, 0, 1.7, step % 8 ? .22 : .3);
  for (const step of [4, 12]) add('snare', step, 0, 1.2, level === 0 ? .12 : .22);
  if (level >= 1) {
    for (const step of [2, 6, 10, 14]) add('open-hat', step, 0, .75, .055, .3);
    for (const step of [0, 4, 8, 12]) add('hat', step, 0, .2, .045, -.25);
  }
  if (level >= 2) {
    const steps = answer ? [0, 2, 6, 8, 11, 14] : [0, 3, 6, 8, 10, 14];
    const motif = variation === 0 ? [0, 1, 2, 1, 0, 3] : variation === 1 ? [0, 2, 1, 0, 3, 1] : [2, 1, 0, 1, 2, 3];
    steps.forEach((step, i) => add('pulse', step, chord.hook[motif[answer ? 5 - i : i]], i === 5 ? 2.4 : .95, i % 3 ? .085 : .115, -.1));
  }
  if (level >= 3) {
    const steps = level === 4 ? [1, 3, 5, 7, 9, 11, 13, 15] : [3, 7, 11, 15];
    steps.forEach((step, i) => add('arp', step, chord.notes[(i + variation) % 3] + 12 + (i % 2 ? 12 : 0), .55, .043, i % 2 ? .65 : -.65));
    for (const step of [7, 15]) add('hat', step, 0, .2, .035, -.4);
  }
  if (level === 4 && answer) add('pulse', 15, chord.hook[variation] + 12, .6, .055, .35);
  if (level >= 3 && bar % 4 === 3) {
    add('snare', 13, 0, .6, .065, -.3);
    add('snare', 15, 0, .6, .1, .3);
  }
  return notes;
}

export const SOUNDTRACKS = {
  'neon-drive': {
    title: 'Neon Drive', compose: composeBar,
    stages: ['Ignition', 'Night drive', 'Neon skyline', 'Fast lane', 'Overdrive'],
    details: ['Dark synth chords. The engine starts.', 'Pulsing octaves and a driving drum machine.', 'A soaring lead cuts through.', 'Rolling arpeggios, bigger drum turnarounds.', 'Sixteenth-note arpeggios and the full lead response.'],
  },
  'vector-run': {
    title: 'Vector Run', compose: composeVectorBar,
    stages: ['Boot sequence', 'Circuit', 'Signal', 'Power surge', 'Hyperdrive'],
    details: ['Clipped synth chords and a restless bassline.', 'Offbeat hats and a broken drum-machine groove.', 'A bright pulse-wave hook locks in.', 'Stereo octave arpeggios and snare pickups.', 'The full arcade groove, answering hooks and extra fills.'],
  },
} satisfies Record<SoundtrackId, { title: string; compose: typeof composeBar; stages: string[]; details: string[] }>;

export function soundtrackId(value: unknown): SoundtrackId {
  return value === 'vector-run' ? value : 'neon-drive';
}

/** A fresh choice for each new round, independent of its country-deck seed. */
export function randomSoundtrack(): SoundtrackId {
  const tracks = Object.keys(SOUNDTRACKS) as SoundtrackId[];
  return tracks[Math.floor(Math.random() * tracks.length)];
}
