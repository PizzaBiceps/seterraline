/** A held pointer remains a tap until movement crosses the pan threshold. */
export class MapPressGesture {
  state: 'idle' | 'pending' | 'pan' = 'idle';
  private x = 0;
  private y = 0;
  private threshold = 6;
  down(x: number, y: number, threshold = 6): void { this.threshold=threshold; this.x=x; this.y=y; this.state='pending'; }
  move(x: number,y: number): void { if(this.state==='pending' && Math.hypot(x-this.x,y-this.y)>this.threshold)this.state='pan'; }
  up(): 'tap' | 'pan' | 'none' { const action=this.state==='pending'?'tap':this.state==='idle'?'none':'pan'; this.state='idle'; return action; }
  cancel(): void { this.state='idle'; }
}
