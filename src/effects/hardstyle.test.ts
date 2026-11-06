import test from 'node:test';
import assert from 'node:assert/strict';
import { composeHardstyleBar, VICTORY_STEP_SECONDS } from './hardstyle';
import { SOUNDTRACKS } from './soundtracks';
test('victory remix preserves both game hooks and adds a bounded four-on-the-floor drop at 160 BPM', () => {
 assert.equal(VICTORY_STEP_SECONDS,60/160/4);
 for (const track of ['neon-drive','vector-run'] as const) for(let bar=0;bar<16;bar++) {
  const notes=composeHardstyleBar(track,42,bar);
  assert.deepEqual(notes.filter(n=>n.instrument==='hard-kick').map(n=>n.step),[0,4,8,12]);
  const melody=(items:typeof notes)=>items.filter(n=>['lead','pulse','hard-lead'].includes(n.instrument)).map(n=>[n.step,n.midi]);
  assert.deepEqual(melody(notes),melody(SOUNDTRACKS[track].compose(42,bar,4)));
  assert.ok(notes.every(n=>n.velocity<=.3 && n.length>0));
  assert.ok(notes.length<100);
 }
});
