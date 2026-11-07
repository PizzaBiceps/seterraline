/** Sparse, quiet noise ticks: fire texture below the soundtrack, never a second music loop. */
export class FireCrackle {
 private active=false;private timer?:ReturnType<typeof setInterval>;private voices=new Set<AudioBufferSourceNode>();
 constructor(private getContext:()=>AudioContext|undefined,private enabled:()=>boolean){document.addEventListener('visibilitychange',()=>this.sync());}
 setActive(value:boolean):void{this.active=value;this.sync();}
 sync():void{
  const ctx=this.getContext();
  if(!this.active||!this.enabled()||document.hidden||!ctx||ctx.state!=='running'){this.stop();return;}
  if(this.timer)return;
  this.timer=setInterval(()=>{if(this.voices.size>=6||Math.random()<.3)return;const context=this.getContext();if(!context||!this.enabled()||document.hidden){this.sync();return;}this.tick(context);},240);
 }
 private tick(ctx:AudioContext):void{
  const seconds=.012+Math.random()*.035,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);
  const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1300+Math.random()*1800;filter.Q.value=.65;
  gain.gain.setValueAtTime(.004+Math.random()*.008,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.00001,ctx.currentTime+seconds);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);this.voices.add(source);
  source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(ctx.currentTime+seconds);
 }
 private stop():void{clearInterval(this.timer);this.timer=undefined;for(const source of this.voices){try{source.stop();}catch{/* already stopped */}}this.voices.clear();}
}
