import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapPressGesture } from './press-gesture';
test('clicks and small movements stay taps', () => {
 const g=new MapPressGesture();g.down(10,10);assert.equal(g.up(),'tap');
 g.down(10,10);g.move(12,13);assert.equal(g.up(),'tap');
});
test('a drag stays a pan even if the pointer returns to its starting point', () => {
 const g=new MapPressGesture();g.down(10,10);g.move(30,10);g.move(10,10);assert.equal(g.up(),'pan');
});
test('cancellation prevents a late release from answering', () => {
 const g=new MapPressGesture();g.down(10,10);g.cancel();assert.equal(g.up(),'none');
});
test('touch jitter stays a tap while deliberate dragging cancels selection', () => {
 const g=new MapPressGesture();
 g.down(100,100,12);g.move(109,104);assert.equal(g.up(),'tap');
 g.down(100,100,12);g.move(114,100);assert.equal(g.up(),'pan');
});
