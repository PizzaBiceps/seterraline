import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeBar, nextEnergy, musicLevel, stepOffset, STEP_SECONDS } from './composition';
test('quick first-try answers build flow; failed countries and assistance lower it without negative energy', () => {
 let energy = 0;
 for (let i=0;i<5;i++) energy = nextEnergy(energy,{type:'correct',clean:true,elapsedMs:4000});
 assert.equal(musicLevel(energy),4);
 assert.ok(nextEnergy(energy,{type:'failed'})<energy);
 assert.ok(nextEnergy(energy,{type:'hint'})<energy);
 assert.equal(nextEnergy(0,{type:'skip'}),0);
 assert.ok(nextEnergy(0,{type:'correct',clean:true,elapsedMs:3000})>nextEnergy(0,{type:'correct',clean:true,elapsedMs:15000}));
 assert.ok(nextEnergy(0,{type:'correct',clean:false,elapsedMs:1000})<1);
});
test('musical phrases are repeatable, bounded, and gain layers with flow', () => {
 assert.deepEqual(composeBar(42,5,4),composeBar(42,5,4));
 assert.notDeepEqual(composeBar(42,5,4),composeBar(99,5,4));
 const simple=composeBar(42,0,0),rich=composeBar(42,0,4);
 assert.ok(rich.length>simple.length);
 assert.ok(!simple.some(n=>n.instrument==='lead'||n.instrument==='hat'));
 assert.ok(rich.some(n=>n.instrument==='lead')&&rich.some(n=>n.instrument==='hat'));
 for(let bar=0;bar<32;bar++) for(const note of composeBar(42,bar,4)) {
  assert.ok(note.step>=0&&note.step<16); assert.ok(note.length>0); assert.ok(note.velocity>0&&note.velocity<=.3);
  assert.ok(note.midi>=0&&note.midi<=96);
 }
});

test('the groove begins immediately and the lead hook survives flow changes', () => {
 const opening=composeBar(42,0,0);
 assert.ok(opening.some(n=>n.instrument==='kick'));
 assert.ok(opening.some(n=>n.instrument==='snare'));
 assert.equal(opening.filter(n=>n.instrument==='pad').length,4);
 for(let bar=0;bar<16;bar++) {
  const hook=composeBar(42,bar,2).filter(n=>n.instrument==='lead');
  const full=composeBar(42,bar,4).filter(n=>n.instrument==='lead');
  assert.deepEqual(full.slice(0,hook.length),hook);
 }
 // The last four bars answer the first four, even under the same chord.
 assert.notDeepEqual(composeBar(42,0,2).filter(n=>n.instrument==='lead'),composeBar(42,4,2).filter(n=>n.instrument==='lead'));
});

test('all flow levels and seeded arrangements stay within the live voice budget', () => {
 for(const seed of [0,42,20261021,0xffffffff]) for(let level=0;level<5;level++) {
  const timeline: { at:number; change:number }[]=[];
  for(let bar=0;bar<16;bar++) for(const note of composeBar(seed,bar,level)) {
   assert.ok(Number.isFinite(note.velocity)&&note.velocity>0&&note.velocity<=.3);
   assert.ok(note.step>=0&&note.step<16&&Number.isInteger(note.step));
   assert.ok(Math.abs(note.pan??0)<=1);
   const at=bar*16+note.step;
   // Includes the longest release, conservatively rounded up.
   timeline.push({at,change:1},{at:at+note.length+2,change:-1});
  }
  timeline.sort((a,b)=>a.at-b.at||a.change-b.change);
  let active=0;
  for(const event of timeline) {active+=event.change;assert.ok(active<64,`voice limit exceeded: ${seed}/${level}`);}
 }
});

test('the straight pulse preserves every beat and bar boundary', () => {
 for(let step=0;step<64;step++) {
  assert.ok(stepOffset(step+1)>stepOffset(step));
  assert.equal(stepOffset(step),step*STEP_SECONDS);
 }
 assert.equal(stepOffset(16),16*STEP_SECONDS);
});
