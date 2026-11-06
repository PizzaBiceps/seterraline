import { SOUNDTRACKS, type SoundtrackId } from './soundtracks';
import type { MusicNote } from './composition';
export const VICTORY_STEP_SECONDS = 60 / 160 / 4;
/** Keep the current soundtrack's hook and harmony, with a 160 BPM hardstyle drop. */
export function composeHardstyleBar(track: SoundtrackId, seed: number, bar: number): MusicNote[] {
 const original = SOUNDTRACKS[track].compose(seed, bar, 4);
 const notes = original.filter(n => !['kick','bass','hat','open-hat','snare','rim'].includes(n.instrument)).map(n => ({ ...n, instrument: (n.instrument === 'lead' || n.instrument === 'pulse' ? 'hard-lead' : n.instrument) as MusicNote['instrument'], velocity: Math.min(.28,n.velocity * (n.instrument==='lead'||n.instrument==='pulse'?1.9:1.1)) }));
 const root = original.find(n => n.instrument === 'bass')?.midi || 45;
 for (const step of [0,4,8,12]) notes.push({ instrument: 'hard-kick', step, midi: root, length: 3.3, velocity: .27 });
 for (const step of [2,6,10,14]) {
  notes.push({ instrument: 'hard-bass', step, midi: root, length: 1.3, velocity: .2 });
  notes.push({ instrument: 'open-hat', step, midi: 0, length: .7, velocity: .055 });
 }
 for (const step of [4,12]) notes.push({ instrument: 'snare', step, midi: 0, length: 1.1, velocity: .16 });
 const chord=original.filter(n=>n.instrument==='pad').map(n=>n.midi).slice(0,3);
 for(const step of [2,6,10,14])chord.forEach((midi,i)=>notes.push({instrument:'chord',step,midi:midi+12,length:1.4,velocity:.075,pan:(i-1)*.5}));
 for(let i=0;i<8;i++)notes.push({instrument:'arp',step:i*2+1,midi:Math.min(96,(chord[i%chord.length]||root+24)+12),length:.65,velocity:.065,pan:i%2?.7:-.7});
 return notes;
}
