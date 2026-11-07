import { test } from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeNote } from './synth';
import type { Instrument } from './composition';
import type { MusicMix } from './music-mix';

test('muting stops every source in a layered instrument and all note nodes are released', () => {
 for (const instrument of ['bass','hard-bass','buzz','hard-lead','lead','pulse','pad','chord','arp','kick','hard-kick','snare','rim','hat','open-hat'] as Instrument[]) {
  const nodes: { disconnected:boolean }[]=[];
  const sources: { stopTimes:number[]; onended: (()=>void)|null; disconnected:boolean }[]=[];
  const parameter=()=>({ value:0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node=()=>{
   const value={disconnected:false,connect(){},disconnect(){this.disconnected=true;}};
   nodes.push(value);return value;
  };
  const source=()=>{
   const value={...node(),frequency:parameter(),detune:parameter(),onended:null as (()=>void)|null,stopTimes:[] as number[],start(){},stop(at:number){this.stopTimes.push(at);}};
   // The spread is a new object; track the actual source for cleanup assertions.
   nodes[nodes.length-1]=value;sources.push(value);return value;
  };
  const context={createWaveShaper:()=>node(),createGain:()=>({...node(),gain:parameter()}),createStereoPanner:()=>({...node(),pan:parameter()}),createBiquadFilter:()=>({...node(),frequency:parameter(),Q:parameter()}),createOscillator:source,createBufferSource:source};
  // Track actual gain/filter objects too, so disconnect checks reflect every allocation.
  const tracked=<T extends object>(value:T):T=>{nodes[nodes.length-1]=value as T & {disconnected:boolean};return value;};
  context.createGain=()=>tracked({...node(),gain:parameter()});
  context.createStereoPanner=()=>tracked({...node(),pan:parameter()});
  context.createBiquadFilter=()=>tracked({...node(),frequency:parameter(),Q:parameter()});
  const duckTimes:number[]=[];
  const mix={music:{},drums:{},duck:(at:number)=>duckTimes.push(at)} as unknown as MusicMix;
  let completions=0;
  const voice=synthesizeNote(context as unknown as BaseAudioContext,mix,{} as AudioBuffer,{instrument,midi:60,step:0,length:2,velocity:.1},1,.14,()=>{completions++;});
  assert.ok(sources.length>=1);
  voice.stop(1.05);
  for(const s of sources) assert.equal(s.stopTimes.at(-1),1.05,`${instrument} left a source playing`);
  sources.forEach((s,index)=>{s.onended!();assert.equal(completions,index===sources.length-1?1:0);});
  assert.ok(nodes.every(n=>n.disconnected),`${instrument} leaked audio nodes`);
  assert.deepEqual(duckTimes,['kick','hard-kick'].includes(instrument)?[1]:[]);
 }
});
