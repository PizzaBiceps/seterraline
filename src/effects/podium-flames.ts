type Ember = { x:number;y:number;vx:number;vy:number;age:number;life:number;height:number;width:number;seed:number;smoke:boolean };
/** Low-resolution randomized flames and smoke anchored outside the results dialog. */
export class PodiumFlames {
 private canvas=document.createElement('canvas');private ctx:CanvasRenderingContext2D|null;private frame=0;private target?:HTMLElement;private place=1;private options:{compact?:boolean;smoke?:boolean}={};
 constructor(parent:HTMLElement,private onActive:(active:boolean)=>void=()=>{}){this.canvas.className='podium-fire';this.canvas.setAttribute('aria-hidden','true');parent.append(this.canvas);this.ctx=this.canvas.getContext('2d');document.addEventListener('visibilitychange',()=>{if(document.hidden){const target=this.target,place=this.place;this.stop();this.target=target;this.place=place;}else if(this.target&&!this.target.hidden)this.play(this.target,this.place,this.options);});}
 stop():void{this.onActive(false);this.target=undefined;cancelAnimationFrame(this.frame);this.frame=0;this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);}
 play(target:HTMLElement,place:number,options:{compact?:boolean;smoke?:boolean}={}):void{
  this.stop();if(!this.ctx||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  this.target=target;this.place=place;this.options=options;this.onActive(true);
  const silver=place===2,palette=silver?['#4b709c','#8bd1f1','#edfaff']:['#bd472b','#ff9e39','#ffe9a2'];
  this.canvas.width=Math.ceil(innerWidth/2);this.canvas.height=Math.ceil(innerHeight/2);
  const particles:Ember[]=[];let previous=performance.now();
  const draw=(time:number)=>{
   this.frame=requestAnimationFrame(draw);if(time-previous<65)return;const dt=Math.min(.1,(time-previous)/1000);previous=time;
   const ctx=this.ctx!;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   if(document.hidden||!target.isConnected||target.hidden){this.stop();return;}
   const r=target.getBoundingClientRect(),left=Math.round(r.left/2),right=Math.round(r.right/2),top=Math.round(r.top/2),bottom=Math.round(r.bottom/2);
   for(let i=0;i<(options.compact?3:silver?6:18);i++){
    const e=Math.random(),side=e<.38?0:e<.64?1:e<.9?2:3,smoke=options.smoke!==false&&i%5===0;
    const x=side===0||side===3?left+Math.random()*(right-left):side===1?left-2:right+2;
    const y=side===0?top-1:side===3?bottom+3:top+Math.random()*(bottom-top);
    particles.push({x,y,vx:(side===1?-1:side===2?1:Math.random()-.5)*(smoke?4:2),vy:smoke?-12-Math.random()*12:-4-Math.random()*8,age:0,life:smoke?1+Math.random():.3+Math.random()*.65,height:options.compact?2+Math.random()*6:(silver?4:6)+Math.random()**2*(silver?7:23),width:options.compact?1+Math.random():(silver?1.5:3)+Math.random()*(silver?1.5:2.5),seed:Math.random()*9,smoke});
   }
   for(let i=particles.length-1;i>=0;i--){
    const f=particles[i];f.age+=dt;if(f.age>=f.life){particles.splice(i,1);continue;}f.x+=f.vx*dt;f.y+=f.vy*dt;
    const life=f.age/f.life;
    if(f.smoke){
     const size=Math.round(2+f.width*life*1.8),x=Math.round(f.x+Math.sin(f.seed+life*4)*life*7),y=Math.round(f.y-f.height*life*.6);
     ctx.globalAlpha=Math.sin(life*Math.PI)*(silver?.12:.19);ctx.fillStyle=silver?'#c4d3e3':'#9ca49e';ctx.fillRect(x-size/2,y-size/2,size,size);ctx.fillRect(x-size*.7,y+size*.2,size*.8,size*.7);continue;
    }
    const height=Math.round(f.height*Math.sin(life*Math.PI)**(.55+f.seed%1)),base=Math.round(f.y);ctx.globalAlpha=.75+.2*(1-life);
    for(let row=0;row<height;row++){
     const p=row/Math.max(1,height),curl=Math.round((Math.sin(f.seed+row*.12+life*3)+Math.sin(f.seed*3+row*.29))*p*(silver?1.5:2.5));
     const width=Math.max(1,Math.round(f.width*(1-p)*(.72+.28*Math.sin(row*.44+f.seed*2))));
     const x=Math.round(f.x)+curl,y=base-row;
     ctx.fillStyle=life>.7?palette[0]:palette[Math.floor(f.seed)%2];ctx.fillRect(x-width,y,width*2,1);
     if(f.seed>5&&p>.35&&p<.7){ctx.fillStyle=palette[0];ctx.fillRect(x+Math.round(Math.sin(f.seed)*width*1.7),y,1,1);}
     if(p<.82){ctx.fillStyle=palette[1];ctx.fillRect(x-Math.max(1,width-1),y,Math.max(1,width*2-2),1);}
     if(p<.3){ctx.fillStyle=palette[2];ctx.fillRect(x-Math.max(1,width-2),y,Math.max(1,width*2-4),1);}
    }
    if(life>.55){ctx.globalAlpha=(1-life)*.8;ctx.fillStyle=palette[1];ctx.fillRect(Math.round(f.x+Math.sin(f.seed)*8),Math.round(f.y-f.height-life*9),1,1);}
   }
   if(particles.length>260)particles.splice(0,particles.length-260);
   ctx.globalAlpha=1;ctx.clearRect(left+1,top+1,right-left-2,bottom-top-2);
   // Pixel hot spots belong to the actual box edge, rather than a repeated flame strip.
   const hot=(x:number,y:number)=>{const noise=(Math.sin(x*.71+y*.43+time*.002)+Math.sin(x*.17-y*.31-time*.003)+2)/4;ctx.fillStyle=noise>.78?palette[2]:noise>.38?palette[1]:palette[0];ctx.globalAlpha=silver?.55:.9;ctx.fillRect(x,y,2,1);};
   for(let x=left;x<right;x+=2){hot(x,top-1);hot(x,bottom);hot(x,top+1);hot(x,bottom-2);}
   for(let y=top;y<bottom;y+=2){hot(left-1,y);hot(right,y);hot(left+1,y);hot(right-2,y);}
   ctx.globalAlpha=1;
  };this.frame=requestAnimationFrame(draw);
 }
}
