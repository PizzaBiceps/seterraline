import test from 'node:test';
import assert from 'node:assert/strict';
import { FireCrackle } from './fire-crackle';
test('fire crackle stops its timer and active noise immediately on mute',()=>{
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval,oldRandom=Math.random;
 let tick:()=>void=()=>{},stops=0,clears=0,enabled=true,disconnected=0;
 const source={buffer:null,onended:null as null|(()=>void),connect(){},disconnect(){disconnected++;},start(){},stop(){stops++;}};
 const context={state:'running',currentTime:0,sampleRate:8000,destination:{},createBuffer:(_channels:number,size:number)=>({getChannelData:()=>new Float32Array(size)}),createBufferSource:()=>source,createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){disconnected++;}}),createBiquadFilter:()=>({frequency:{value:0},Q:{value:0},type:'',connect(){},disconnect(){disconnected++;}})};
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener(){}}});
  globalThis.setInterval=((callback:()=>void)=>{tick=callback;return 1;}) as unknown as typeof setInterval;
  globalThis.clearInterval=(()=>{clears++;}) as typeof clearInterval;Math.random=()=>.7;
  const fire=new FireCrackle(()=>context as unknown as AudioContext,()=>enabled);fire.setActive(true);tick();assert.equal(stops,1);
  enabled=false;fire.sync();assert.equal(stops,2);assert.ok(clears>0);source.onended!();assert.equal(disconnected,3);
 }finally{if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;Math.random=oldRandom;}
});
