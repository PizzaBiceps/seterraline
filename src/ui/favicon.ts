import favicon from '../assets/seterraline-favicon.svg';
import { COMPASS_ARRIVAL_MS, compassArrivalAngle } from './compass-motion';

let played = false;
/** Repeat the existing turn until the map finishes loading or fails. */
export function startFaviconLoading(): () => void {
 const controller = new AbortController();
 void playFaviconArrival(true, controller.signal);
 return () => controller.abort();
}

/** An additional icon link animates; the original static link is never changed. */
export async function playFaviconArrival(replay = false, loading?: AbortSignal): Promise<void> {
 if (played && !replay) return;
 if (!loading) played = true;
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 const original = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
 if (!original || motion.matches || document.hidden) return;
 const started = performance.now();
 try {
  const front = new Image(); front.src = favicon; await front.decode();
  if (loading?.aborted || motion.matches || document.hidden || (!loading && performance.now()-started >= COMPASS_ARRIVAL_MS)) return;
  const face = document.createElement('canvas'); face.width = face.height = 16;
  const faceCtx = face.getContext('2d');
  const pixel = document.createElement('canvas'); pixel.width = pixel.height = 16;
  const ctx = pixel.getContext('2d');
  const output = document.createElement('canvas'); output.width = output.height = 32;
  const out = output.getContext('2d');
  if (!faceCtx || !ctx || !out) return;
  faceCtx.drawImage(front,0,0,16,16);
  faceCtx.globalCompositeOperation = 'source-in';
  faceCtx.fillStyle = '#805333'; faceCtx.fillRect(0,0,16,16);
  ctx.imageSmoothingEnabled = out.imageSmoothingEnabled = false;
  const icon = document.createElement('link'); icon.rel = 'icon'; icon.type = 'image/png'; icon.sizes = '32x32';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  const restore = () => {
   if (finished) return;
   finished = true; clearTimeout(timer);
   // Also request the original explicitly for browsers that retain a removed icon.
   icon.type = original.type; icon.href = original.href; icon.remove();
   loading?.removeEventListener('abort', restore);
   motion.removeEventListener('change', restore);
   document.removeEventListener('visibilitychange', onVisibility);
   window.removeEventListener('pagehide', restore);
  };
  const onVisibility = () => { if (document.hidden) restore(); };
  const draw = () => {
   try {
    const elapsed = (performance.now()-started)/COMPASS_ARRIVAL_MS;
    const progress = loading ? elapsed % 1 : Math.min(1, elapsed);
    const radians = compassArrivalAngle(progress)*Math.PI/180;
    const cosine = Math.cos(radians), sine = Math.sin(radians);
    // Keep a one-pixel casing visible when the dial is edge-on.
    const width = Math.abs(cosine) < .065 ? (cosine < 0 ? -.065 : .065) : cosine;
    ctx.clearRect(0,0,16,16);
    for (let z=-1;z<=1;z++) {
     ctx.save(); ctx.translate(8+Math.round(sine*z),0); ctx.scale(width,1);
     ctx.drawImage(face,-8,0); ctx.restore();
    }
    ctx.save(); ctx.translate(8+Math.round(sine*(cosine>=0?1:-1)),0); ctx.scale(width,1);
    ctx.drawImage(cosine>=0?front:face,-8,0,16,16); ctx.restore();
    out.clearRect(0,0,32,32); out.drawImage(pixel,0,0,32,32);
    icon.href = output.toDataURL('image/png');
    if (!icon.isConnected) document.head.append(icon);
    if (progress>=1) { restore(); return; }
    timer = setTimeout(draw,75);
   } catch { restore(); }
  };
  loading?.addEventListener('abort',restore, { once: true });
  motion.addEventListener('change',restore);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',restore);
  draw();
 } catch { /* Unsupported canvas or image decoding leaves the static icon intact. */ }
}
