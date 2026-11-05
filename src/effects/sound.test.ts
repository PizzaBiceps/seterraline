import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundEffects } from './sound.ts';

test('country tap and answer sounds can play together; duplicate taps and muted inputs stay silent', () => {
 const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
 const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
 const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
 let time = 1000, voices = 0;
 const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
 class Audio {
  state = 'running'; currentTime = 0; destination = {};
  createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
  createOscillator() {
   voices++;
   return { type: '', frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
  }
 }
 try {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden: false } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Audio });
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => time } });
  const sounds = new SoundEffects();
  sounds.play('map-click'); assert.equal(voices, 1);
  sounds.play('correct'); assert.equal(voices, 3, 'a tap must not swallow the two-note correct cue');
  sounds.play('map-click'); assert.equal(voices, 3, 'same-input duplicate is suppressed');
  time += 60; sounds.play('map-click'); assert.equal(voices, 4);
  sounds.play('wrong'); assert.equal(voices, 6, 'wrong answers can also sound alongside taps');
  sounds.toggle(); time += 60; sounds.play('map-click'); sounds.play('correct'); assert.equal(voices, 6);
 } finally {
  for (const [key, descriptor] of [['document', originalDocument], ['AudioContext', originalAudio], ['performance', originalPerformance]] as const) {
   if (descriptor) Object.defineProperty(globalThis, key, descriptor);
   else Reflect.deleteProperty(globalThis, key);
  }
 }
});
