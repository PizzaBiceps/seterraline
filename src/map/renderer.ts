import { TouchNavigation } from './touch-navigation';
import { MapPressGesture } from './press-gesture';
import { geoNaturalEarth1, geoStream } from 'd3-geo';
import { needsPickingHelp, resolveCountries, resolveMapTap, segmentDistance, type NearbyCountry } from './picking';
import { triangulateRings } from './geometry';
import type { Country, Region } from '../game/engine';
import type { Feature, Geometry, FeatureCollection } from 'geojson';
export type CountryFeature = Feature<Geometry, Omit<Country, 'id'>> & { id: string };
export type Atlas = FeatureCollection<Geometry, Omit<Country, 'id'>> & { features: CountryFeature[] };
type Shape = { id: string; start: number; count: number; bounds: number[]; borderStart: number; borderCount: number };
const COLORS = { base: '#000000', inactive: '#142d35', border: '#203d36', hover: '#e7d39b', correct: '#74c28b', wrong: '#e27c5c', hint: '#ffd778' };
function rgb(hex: string): number[] { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); }
/** Four batched draw calls: baked terrain, vector highlights, borders, and markers. */
export class AtlasRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;
  private borderBuffer: WebGLBuffer;
  private borderVertexCount = 0;
  private terrainTexture: WebGLTexture;
  private backgroundBuffer: WebGLBuffer;
  private showBorders = true;
  private smolderUntil = 0;
  private smolderTimer?: ReturnType<typeof setInterval>;
  private pixelSize = 1;
  private terrainCanvas: HTMLImageElement;
  private markerBuffer: WebGLBuffer;
  private markerColorBuffer: WebGLBuffer;
  private markers: { id: string; x: number; y: number }[] = [];
  private shapes: Shape[] = [];
  private vertices: number[] = [];
  private borders: number[] = [];
  private colors: Float32Array = new Float32Array();
  private projection = geoNaturalEarth1().translate([0, 0]).scale(178);
  private zoom = 1;
  private center = [0, 8];
  private width = 1;
  private height = 1;
  private hover: string | null = null;
  private active = new Set<string>();
  private solved = new Set<string>();
  private flash: { id: string; kind: 'wrong' | 'hint' } | null = null;
  private frame = 0;
  private observer: ResizeObserver;
  private drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  private lost = false;
  private press = new MapPressGesture();
  private pointerId: number | null = null;
  private touch = new TouchNavigation();
  private viewKey = '';
  onViewChange: () => void = () => {};
  onInspect: (x: number, y: number) => void = () => {};
  onPick: (id: string) => void = () => {};
  onCountryTap: () => void = () => {};
  onHover: (id: string | null, x: number, y: number) => void = () => {};
  onContextLost: () => void = () => {};
  constructor(private canvas: HTMLCanvasElement, atlas: Atlas, terrain: HTMLImageElement) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL is unavailable. Enable hardware acceleration or try another browser.');
    this.gl = gl;
    const shader = (type: number, source: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Shader compilation failed'); return s; };
    const vert = shader(gl.VERTEX_SHADER, `
      attribute vec2 a_position; attribute vec3 a_color; attribute vec2 a_normal;
      uniform vec2 u_center; uniform vec2 u_half; uniform float u_scale; uniform float u_pointSize; uniform float u_borderWidth;
      varying vec3 v_color; varying vec2 v_world;
      void main(){ vec2 p=((a_position-u_center)*u_scale+a_normal*u_borderWidth*.5)/u_half; gl_Position=vec4(p.x,-p.y,0.,1.); gl_PointSize=u_pointSize; v_color=a_color; v_world=a_position; }
    `);
    const frag = shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 v_color; varying vec2 v_world;
      uniform float u_smolder; uniform float u_fireTime; uniform float u_layer; uniform sampler2D u_terrain;
      void main(){
        if(u_layer<0.5){gl_FragColor=texture2D(u_terrain,(v_world+vec2(540.,288.))/vec2(1080.,576.));}
        else if(u_layer<1.5){if(max(max(v_color.r,v_color.g),v_color.b)<0.01) discard; gl_FragColor=vec4(v_color,.62);}
        else if(u_layer<2.5){
          if(u_smolder>.5){
            float heat=.5+.5*sin(v_world.x*.6+v_world.y*.8+u_fireTime*2.);
            float sparks=pow(max(0.,sin(v_world.x*3.+v_world.y*2.-u_fireTime*3.)),12.);
            vec3 ember=mix(vec3(.75,.12,.025),vec3(1.,.66,.12),heat);
            gl_FragColor=vec4(mix(ember,vec3(1.,.94,.58),sparks),.72+heat*.25);
          } else gl_FragColor=vec4(v_color,.48);
        }
        else {
          float edge=abs(gl_PointCoord.x-.5)+abs(gl_PointCoord.y-.5);
          if(edge>.5)discard;
          // An opaque ink rim keeps tiny countries visible on both light land and sea.
          gl_FragColor=vec4(edge>.32?vec3(.055,.12,.15):v_color,1.);
        }
      }
    `);
    this.program = gl.createProgram()!; gl.attachShader(this.program, vert); gl.attachShader(this.program, frag); gl.linkProgram(this.program); gl.deleteShader(vert); gl.deleteShader(frag);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Unable to initialize map renderer');
    this.positionBuffer = gl.createBuffer()!; this.colorBuffer = gl.createBuffer()!; this.borderBuffer = gl.createBuffer()!;
    this.markerBuffer = gl.createBuffer()!; this.markerColorBuffer = gl.createBuffer()!;
    this.backgroundBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.backgroundBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-540,-288,540,-288,-540,288,-540,288,540,-288,540,288]), gl.STATIC_DRAW);
    this.terrainCanvas = terrain;
    this.terrainTexture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,this.terrainTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.terrainCanvas);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.clearColor(37/255,69/255,79/255,1); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    for (const feature of atlas.features) {
      const start = this.vertices.length / 2, borderStart = this.borders.length;
      let rings: number[][] = [], ring: number[] = [];
      geoStream(feature, this.projection.stream({
        point: (x: number, y: number) => { ring.push(x, y); },
        lineStart: () => { ring = []; },
        lineEnd: () => { if (ring.length >= 6) rings.push(ring); },
        polygonStart: () => { rings = []; },
        polygonEnd: () => {
          if (!rings.length) return;
          const triangles = triangulateRings(rings);
          for (const value of triangles) this.vertices.push(value);
          for (const r of rings) for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; this.borders.push(r[i], r[i + 1], r[j], r[j + 1]); }
        }, sphere: () => {},
      }));
      const end = this.vertices.length / 2;
      const bounds = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = start * 2; i < end * 2; i += 2) { bounds[0] = Math.min(bounds[0], this.vertices[i]); bounds[1] = Math.min(bounds[1], this.vertices[i + 1]); bounds[2] = Math.max(bounds[2], this.vertices[i]); bounds[3] = Math.max(bounds[3], this.vertices[i + 1]); }
      this.shapes.push({ id: String(feature.id), start, count: end - start, bounds, borderStart, borderCount: this.borders.length - borderStart });
      if (feature.properties.independent && Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) < 5) {
        this.markers.push({ id: String(feature.id), x: (bounds[0] + bounds[2]) / 2, y: (bounds[1] + bounds[3]) / 2 });
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    // Extruded triangles give consistent thickness even where WebGL only supports 1px lines.
    const borderMesh: number[] = [];
    for (let i = 0; i < this.borders.length; i += 4) {
      const [ax, ay, bx, by] = this.borders.slice(i, i + 4);
      const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
      if (!length) continue;
      const nx = -dy / length, ny = dx / length;
      borderMesh.push(ax,ay,nx,ny, ax,ay,-nx,-ny, bx,by,nx,ny,
        bx,by,nx,ny, ax,ay,-nx,-ny, bx,by,-nx,-ny);
    }
    this.borderVertexCount = borderMesh.length / 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.borderBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(borderMesh), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markerBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.markers.flatMap(m => [m.x, m.y])), gl.STATIC_DRAW);
    this.colors = new Float32Array(this.vertices.length / 2 * 3);
    this.observer = new ResizeObserver(() => { this.cancelGesture(); const r = canvas.getBoundingClientRect(); this.width = r.width; this.height = r.height; canvas.width = Math.round(r.width / this.pixelSize); canvas.height = Math.round(r.height / this.pixelSize); this.invalidate(); });
    this.observer.observe(canvas); this.paint();
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      if (e.pointerType === 'touch') {
        const action = this.touch.down(e.pointerId, { x:e.clientX-rect.left,y:e.clientY-rect.top }, this.touchView());
        if (action !== 'single') {
          this.cancelPress(false);
          for (const id of this.touch.points.keys()) canvas.setPointerCapture(id);
          return;
        }
      }
      if (!e.isPrimary || e.button !== 0) { this.cancelGesture(); return; }
      this.cancelPress(); this.pointerId = e.pointerId;
      this.drag = { x:e.clientX,y:e.clientY,cx:this.center[0],cy:this.center[1],moved:false };
      this.press.down(e.clientX,e.clientY,e.pointerType==='touch'?12:6);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && this.touch.points.has(e.pointerId)) {
        const rect = canvas.getBoundingClientRect();
        const view = this.touch.move(e.pointerId, { x:e.clientX-rect.left,y:e.clientY-rect.top }, this.touchView());
        if (view) { this.zoom=view.zoom; this.center=view.center; this.clamp(); this.invalidate(); return; }
        if (this.touch.blocked) return;
      }
      if (this.pointerId !== null && this.pointerId !== e.pointerId) return;
      if (this.drag) {
        const wasPan = this.press.state === 'pan';
        this.press.move(e.clientX,e.clientY);
        if(this.press.state==='pan'){
          this.drag.moved=true;
          if (!wasPan) { this.drag.x=e.clientX; this.drag.y=e.clientY; this.drag.cx=this.center[0]; this.drag.cy=this.center[1]; }
          this.center=[this.drag.cx-(e.clientX-this.drag.x)/this.scale(),this.drag.cy-(e.clientY-this.drag.y)/this.scale()];
          this.clamp();this.invalidate();return;
        }
      }
      const rect=canvas.getBoundingClientRect(), x=e.clientX-rect.left,y=e.clientY-rect.top;
      const id=this.pick(x,y);if(id!==this.hover){this.hover=id;this.paint();}this.onHover(id,x,y);
    });
    canvas.addEventListener('pointerup',e=>{
      if (e.pointerType==='touch' && this.touch.up(e.pointerId,this.touchView())) return;
      if(this.pointerId!==e.pointerId)return;
      const action=this.press.up(),down=this.drag;
      this.pointerId=null;this.drag=null;
      if(action==='tap'){
        const rect=canvas.getBoundingClientRect(),x=(down?.x??e.clientX)-rect.left,y=(down?.y??e.clientY)-rect.top;
        const ids=this.candidates(x,y,e.pointerType==='touch'?20:12);
        if(ids.length)this.onCountryTap();
        const result=resolveMapTap(ids,this.pickExact(x,y),this.zoom);
        if(result.kind==='inspect')this.onInspect(x,y);
        else if(result.kind==='pick')this.onPick(result.id);
      }
    });
    canvas.addEventListener('pointercancel',()=>this.cancelGesture());
    canvas.addEventListener('lostpointercapture',e=>{if(this.pointerId===e.pointerId || this.touch.points.has(e.pointerId))this.cancelGesture();});
    window.addEventListener('blur',()=>this.cancelGesture());
    canvas.addEventListener('pointerleave', () => { this.hover = null; this.paint(); this.onHover(null, 0, 0); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.cancelGesture(); const rect = canvas.getBoundingClientRect(); this.zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - rect.left, e.clientY - rect.top); }, { passive: false });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.onContextLost(); });
    canvas.addEventListener('keydown', e => { if (['+', '=', '-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','0'].includes(e.key)) e.preventDefault(); if (e.key === '+' || e.key === '=') this.zoomBy(1.4); if (e.key === '-') this.zoomBy(1 / 1.4); if (e.key === '0') this.focus('World'); if (e.key.startsWith('Arrow')) { const step = 45 / this.scale(); this.center[0] += e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0; this.center[1] += e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0; this.clamp(); this.invalidate(); } });
  }
  get isTouchNavigation(): boolean { return this.touch.blocked; }
  private touchView() { return { center:this.center,zoom:this.zoom,width:this.width,height:this.height,baseScale:Math.min(this.width/1040,this.height/550) }; }
  cancelGesture(): void {
    const ids=[...this.touch.points.keys()]; this.touch.cancel();
    this.cancelPress();
    for (const id of ids) if(this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
  }
  private cancelPress(release = true): void {
    this.press.cancel();this.drag=null;
    const id=this.pointerId;this.pointerId=null;
    if(release && id!==null && this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
  }
  private scale(): number { return Math.min(this.width / 1040, this.height / 550) * this.zoom; }
  private clamp(): void { this.center[0] = Math.max(-510, Math.min(510, this.center[0])); this.center[1] = Math.max(-270, Math.min(270, this.center[1])); }
  private zoomAt(factor: number, x: number, y: number): void { const before = this.scale(); const wx = (x - this.width / 2) / before + this.center[0], wy = (y - this.height / 2) / before + this.center[1]; this.zoom = Math.max(1, Math.min(16, this.zoom * factor)); const after = this.scale(); this.center = [wx - (x - this.width / 2) / after, wy - (y - this.height / 2) / after]; this.clamp(); this.invalidate(); }
  inspectAt(x: number, y: number): void {
    this.hover = null; this.onHover(null, 0, 0);
    this.zoomAt(2.25, x, y); this.paint();
  }
  zoomBy(factor: number): void { this.zoomAt(factor, this.width / 2, this.height / 2); }
  focus(region: Region): void { this.cancelGesture(); const views: Record<Region, [number, number, number]> = { World: [0, 5, 1], Europe: [17, 53, 4.1], Asia: [92, 33, 1.9], Africa: [19, 1, 2.25], Americas: [-84, 9, 1.5], Oceania: [143, -22, 2.6] }; const [lon, lat, zoom] = views[region]; this.center = this.projection([lon, lat])!; this.zoom = zoom; this.invalidate(); }
  smolderBorders(duration = 12800): void {
    clearInterval(this.smolderTimer); this.smolderUntil = duration > 0 ? performance.now() + duration : 0; this.invalidate();
    if (duration <= 0) return;
    this.smolderTimer = setInterval(() => {
      if (document.hidden || performance.now() >= this.smolderUntil) {
        clearInterval(this.smolderTimer); this.smolderUntil = 0;
      }
      this.invalidate();
    }, 100);
  }
  setState(active: Set<string>, solved: Set<string>, flash: { id: string; kind: 'wrong' | 'hint' } | null = null): void { this.active = active; this.solved = solved; this.flash = flash; this.paint(); }
  private colorFor(id: string): number[] {
    let color = COLORS.base;
    if (this.solved.has(id)) color = COLORS.correct;
    if (this.hover === id) color = COLORS.hover;
    if (this.flash?.id === id) color = COLORS[this.flash.kind];
    return rgb(color);
  }
  private paint(): void {
    for (const shape of this.shapes) { const c = this.colorFor(shape.id); for (let i = shape.start; i < shape.start + shape.count; i++) { const offset = i * 3; this.colors[offset] = c[0]; this.colors[offset + 1] = c[1]; this.colors[offset + 2] = c[2]; } }
    const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer); gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markerColorBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.markers.flatMap(m => this.active.has(m.id) ? (this.flash?.id === m.id || this.solved.has(m.id) || this.hover === m.id ? this.colorFor(m.id) : rgb('#fff0b8')) : rgb(COLORS.inactive))), gl.DYNAMIC_DRAW);
    this.invalidate();
  }
  private invalidate(): void { if (!this.frame && !this.lost) this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); }); }
  setBorders(visible: boolean): void { this.showBorders = visible; this.invalidate(); }
  setPixelSize(size: number): void { this.pixelSize = Math.max(1, Math.min(3, Math.round(size))); size = this.pixelSize; this.canvas.width = Math.round(this.width / size); this.canvas.height = Math.round(this.height / size); this.invalidate(); }
  get zoomLevel(): number { return this.zoom; }
  project(lon: number, lat: number): { x: number; y: number } {
    const point = this.projection([lon, lat])!;
    return { x: (point[0] - this.center[0]) * this.scale() + this.width / 2, y: (point[1] - this.center[1]) * this.scale() + this.height / 2 };
  }
  private candidates(sx: number, sy: number, radius: number): string[] {
    const scale = this.scale(), x = (sx - this.width / 2) / scale + this.center[0], y = (sy - this.height / 2) / scale + this.center[1];
    const exact = this.pickExact(sx, sy), hits: NearbyCountry[] = [], tolerance = radius / scale;
    for (const shape of this.shapes) {
      if (!this.active.has(shape.id)) continue;
      const b = shape.bounds, small = needsPickingHelp(b, scale, radius);
      if (shape.id === exact) hits.push({ id: shape.id, exact: true, small, distance: 0 });
      else if (small && x >= b[0] - tolerance && x <= b[2] + tolerance && y >= b[1] - tolerance && y <= b[3] + tolerance) {
        let distance = Infinity;
        for (let i = shape.borderStart; i < shape.borderStart + shape.borderCount; i += 4) distance = Math.min(distance, segmentDistance(x, y, this.borders[i], this.borders[i+1], this.borders[i+2], this.borders[i+3]) * scale);
        const marker = this.markers.find(m => m.id === shape.id);
        if (marker) distance = Math.min(distance, Math.hypot(x - marker.x, y - marker.y) * scale);
        hits.push({ id: shape.id, exact: false, small: true, distance });
      }
    }
    return resolveCountries(hits, radius);
  }
  exportMap(): string { return this.terrainCanvas.src; }
  private draw(): void {
    const key = `${this.width}:${this.height}:${this.zoom}:${this.center[0]}:${this.center[1]}`;
    if (key !== this.viewKey) { this.viewKey = key; this.onViewChange(); }
    const smolder = performance.now() < this.smolderUntil && !document.hidden;
    const gl = this.gl; gl.viewport(0,0,this.canvas.width,this.canvas.height); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.program);
    gl.uniform1f(gl.getUniformLocation(this.program,'u_smolder'),smolder ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.program,'u_fireTime'),matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : performance.now()/1000);
    gl.uniform2f(gl.getUniformLocation(this.program,'u_center'),this.center[0],this.center[1]); gl.uniform2f(gl.getUniformLocation(this.program,'u_half'),this.width/2,this.height/2);
    gl.uniform1f(gl.getUniformLocation(this.program,'u_scale'),this.scale()); gl.uniform1i(gl.getUniformLocation(this.program,'u_terrain'),0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.terrainTexture);
    const pos=gl.getAttribLocation(this.program,'a_position'),col=gl.getAttribLocation(this.program,'a_color'),normal=gl.getAttribLocation(this.program,'a_normal'); gl.enableVertexAttribArray(pos); gl.disableVertexAttribArray(col); gl.vertexAttrib3f(col,0,0,0);
    gl.disableVertexAttribArray(normal); gl.vertexAttrib2f(normal,0,0);
    gl.uniform1f(gl.getUniformLocation(this.program,'u_layer'),0); gl.bindBuffer(gl.ARRAY_BUFFER,this.backgroundBuffer); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,6);
    gl.uniform1f(gl.getUniformLocation(this.program,'u_layer'),1); gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer); gl.enableVertexAttribArray(col); gl.vertexAttribPointer(col,3,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,this.vertices.length/2);
    if(this.showBorders){
      gl.uniform1f(gl.getUniformLocation(this.program,'u_layer'),2);
      gl.uniform1f(gl.getUniformLocation(this.program,'u_borderWidth'),(smolder ? 2.6 : 1.1) + Math.min(.5,Math.log2(this.zoom)*.14));
      gl.bindBuffer(gl.ARRAY_BUFFER,this.borderBuffer); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,16,0);
      gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal,2,gl.FLOAT,false,16,8);
      gl.disableVertexAttribArray(col); gl.vertexAttrib3f(col,...rgb(COLORS.border) as [number,number,number]);
      gl.drawArrays(gl.TRIANGLES,0,this.borderVertexCount);
      gl.disableVertexAttribArray(normal); gl.vertexAttrib2f(normal,0,0);
    }
    gl.uniform1f(gl.getUniformLocation(this.program,'u_layer'),3); gl.uniform1f(gl.getUniformLocation(this.program,'u_pointSize'),(11 + Math.min(6,Math.log2(this.zoom)*1.5))/this.pixelSize);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.markerBuffer); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0); gl.bindBuffer(gl.ARRAY_BUFFER,this.markerColorBuffer); gl.enableVertexAttribArray(col); gl.vertexAttribPointer(col,3,gl.FLOAT,false,0,0); gl.drawArrays(gl.POINTS,0,this.markers.length);
  }
  private pick(sx: number, sy: number): string | null {
    const choices = this.candidates(sx, sy, 12);
    return choices[0] ?? this.pickExact(sx, sy);
  }
  private pickExact(sx: number, sy: number): string | null { const x = (sx - this.width / 2) / this.scale() + this.center[0], y = (sy - this.height / 2) / this.scale() + this.center[1], v = this.vertices; for (const s of this.shapes) { if (x < s.bounds[0] || y < s.bounds[1] || x > s.bounds[2] || y > s.bounds[3]) continue; for (let i = s.start * 2; i < (s.start + s.count) * 2; i += 6) { const a = (x - v[i + 2]) * (v[i + 1] - v[i + 3]) - (v[i] - v[i + 2]) * (y - v[i + 3]); const b = (x - v[i + 4]) * (v[i + 3] - v[i + 5]) - (v[i + 2] - v[i + 4]) * (y - v[i + 5]); const c = (x - v[i]) * (v[i + 5] - v[i + 1]) - (v[i + 4] - v[i]) * (y - v[i + 1]); if (!((a < 0 || b < 0 || c < 0) && (a > 0 || b > 0 || c > 0))) return s.id; } } return null; }
  destroy(): void { clearInterval(this.smolderTimer); this.cancelGesture(); this.observer.disconnect(); cancelAnimationFrame(this.frame); this.gl.deleteBuffer(this.positionBuffer); this.gl.deleteBuffer(this.colorBuffer); this.gl.deleteBuffer(this.borderBuffer); this.gl.deleteBuffer(this.markerBuffer); this.gl.deleteBuffer(this.markerColorBuffer); this.gl.deleteProgram(this.program); this.gl.deleteTexture(this.terrainTexture); this.gl.deleteBuffer(this.backgroundBuffer); }
}
