import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDTRACKS, soundtrackId } from './soundtracks';
import { composeBar, STEP_SECONDS } from './composition';

test('the original remains the default and invalid preview choices recover safely', () => {
 for (const value of [null,undefined,'removed-track','__proto__',{},'']) assert.equal(soundtrackId(value),'neon-drive');
 assert.equal(soundtrackId('vector-run'),'vector-run');
 assert.deepEqual(SOUNDTRACKS['neon-drive'].compose(42,7,4),composeBar(42,7,4));
 assert.notDeepEqual(SOUNDTRACKS['vector-run'].compose(42,7,4),composeBar(42,7,4));
});

test('both soundtracks develop through five deterministic, bounded arrangements', () => {
 for(const track of Object.values(SOUNDTRACKS)) {
  assert.equal(track.stages.length,5);assert.equal(track.details.length,5);
  for(const seed of [0,42,20261021,0xffffffff]) for(let level=0;level<5;level++) {
   const events:{at:number;change:number}[]=[];
   for(let bar=0;bar<16;bar++) {
    const notes=track.compose(seed,bar,level);
    assert.deepEqual(notes,track.compose(seed,bar,level));
    assert.ok(notes.some(n=>n.instrument==='kick'));
    assert.ok(notes.some(n=>n.instrument==='pad'));
    assert.equal(notes.some(n=>n.instrument==='lead'||n.instrument==='pulse'),level>=2);
    assert.equal(notes.some(n=>n.instrument==='arp'),level>=3);
    for(const note of notes) {
     assert.ok(Number.isInteger(note.step)&&note.step>=0&&note.step<16);
     assert.ok(note.midi>=0&&note.midi<=96&&note.length>0);
     assert.ok(note.velocity>0&&note.velocity<=.3&&Math.abs(note.pan??0)<=1);
     const at=(bar*16+note.step)*STEP_SECONDS;
     events.push({at,change:1},{at:at+note.length*STEP_SECONDS+.25,change:-1});
    }
   }
   events.sort((a,b)=>a.at-b.at||a.change-b.change);
   let count=0;
   for(const event of events){count+=event.change;assert.ok(count<64,`${track.title} exceeds voice budget`);}
  }
  assert.ok(track.compose(42,7,4).length>track.compose(42,7,0).length);
 }
});

test('new rounds reroll the soundtrack even with the same deck seed; mute does not reroll', async () => {
 const { FlowMusic } = await import('./music');
 const originalDocument = Object.getOwnPropertyDescriptor(globalThis,'document');
 const originalRandom = Math.random;
 try {
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener(){}}});
  const music = new FlowMusic(()=>undefined);
  Math.random=()=>.1; music.reset(42);
  assert.equal(music.soundtrackId,'neon-drive');
  Math.random=()=>.9; music.setMuted(true); music.setMuted(false); music.unlock();
  assert.equal(music.soundtrackId,'neon-drive');
  music.reset(42);
  assert.equal(music.soundtrackId,'vector-run');
  Math.random=()=>.1; music.reset(99);
  assert.equal(music.soundtrackId,'neon-drive');
 } finally {
  Math.random=originalRandom;
  if(originalDocument) Object.defineProperty(globalThis,'document',originalDocument);
  else Reflect.deleteProperty(globalThis,'document');
 }
});
