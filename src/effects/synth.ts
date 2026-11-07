import type { MusicNote } from './composition';
import type { MusicMix } from './music-mix';

export interface MusicVoice { stop(at: number): void }

export function createMusicNoise(ctx: BaseAudioContext): AudioBuffer {
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .45), ctx.sampleRate);
  const channel = noise.getChannelData(0);
  let bits = 0x13579;
  for (let i = 0; i < channel.length; i++) { bits ^= bits << 13; bits ^= bits >>> 17; bits ^= bits << 5; channel[i] = (bits >>> 0) / 2147483648 - 1; }
  return noise;
}

/** Shared live/offline instruments. All sources and their nodes are released together. */
export function synthesizeNote(ctx: BaseAudioContext, mix: MusicMix, noise: AudioBuffer, note: MusicNote, start: number, stepLength: number, ended: (voice: MusicVoice) => void = () => {}): MusicVoice {
  const sources: AudioScheduledSourceNode[] = [], nodes: AudioNode[] = [];
  const envelope = ctx.createGain(), pan = ctx.createStereoPanner();
  const length = note.length * stepLength, frequency = 440 * 2 ** ((note.midi - 69) / 12);
  const percussion = ['kick', 'hard-kick', 'snare', 'rim', 'hat', 'open-hat'].includes(note.instrument);
  const pad = note.instrument === 'pad', release = pad ? .24 : note.instrument === 'lead' ? .16 : .04;
  const end = start + length + release;
  nodes.push(envelope, pan); pan.pan.value = note.pan ?? 0;
  envelope.connect(pan); pan.connect(percussion ? mix.drums : mix.music);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(note.velocity, start + (pad ? .18 : .003));
  if (pad) {
    envelope.gain.setValueAtTime(note.velocity * .8, start + length * .75);
    envelope.gain.linearRampToValueAtTime(0, end);
  } else if (note.instrument === 'snare') {
    // A brief gated noise tail gives the drum-machine snare its 80s crack.
    envelope.gain.exponentialRampToValueAtTime(note.velocity * .55, start + .025);
    envelope.gain.setValueAtTime(note.velocity * .3, start + length * .75);
    envelope.gain.linearRampToValueAtTime(0, end);
  } else {
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, note.velocity * (note.instrument === 'lead' ? .65 : .06)), start + Math.max(.015, length));
    envelope.gain.linearRampToValueAtTime(0, end);
  }

  const filter = (type: BiquadFilterType, hz: number, q = .7): BiquadFilterNode => {
    const node = ctx.createBiquadFilter(); node.type = type; node.frequency.value = hz; node.Q.value = q; nodes.push(node); return node;
  };
  const oscillator = (type: OscillatorType, hz: number, destination: AudioNode, volume = 1, detune = 0): OscillatorNode => {
    const source = ctx.createOscillator(), gain = ctx.createGain();
    source.type = type; source.frequency.setValueAtTime(hz, start); source.detune.value = detune;
    gain.gain.value = volume; source.connect(gain); gain.connect(destination);
    sources.push(source); nodes.push(gain); return source;
  };
  const hiss = (destination: AudioNode, volume = 1): void => {
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = noise; gain.gain.value = volume; source.connect(gain); gain.connect(destination);
    sources.push(source); nodes.push(gain);
  };

  switch (note.instrument) {
    case 'hard-kick': {
      const distortion = ctx.createWaveShaper(), low = filter('lowpass', 2400);
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 511.5 - 1) * 14) * .7;
      distortion.curve = curve; distortion.oversample = '2x'; nodes.push(distortion);
      distortion.connect(low); low.connect(envelope);
      const punch = oscillator('sine', 190, distortion, .8);
      punch.frequency.exponentialRampToValueAtTime(frequency / 2, start + .065);
      oscillator('sawtooth', frequency / 2, distortion, .13);
      envelope.gain.cancelScheduledValues(start);envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(note.velocity,start+.002);
      envelope.gain.exponentialRampToValueAtTime(note.velocity*.55,start+.035);envelope.gain.setValueAtTime(note.velocity*.5,start+length*.72);envelope.gain.linearRampToValueAtTime(0,end);
      mix.duck(start, .65); break;
    }
    case 'kick': {
      const sub = oscillator('sine', 155, envelope);
      sub.frequency.exponentialRampToValueAtTime(48, start + .045);
      sub.frequency.exponentialRampToValueAtTime(39, end);
      const click = filter('lowpass', 1800); click.connect(envelope); hiss(click, .09);
      mix.duck(start, .48);
      break;
    }
    case 'snare': {
      const snap = filter('highpass', 1100, .65); snap.connect(envelope); hiss(snap, 1.25);
      const body = oscillator('triangle', 190, envelope, .48);
      body.frequency.exponentialRampToValueAtTime(125, start + .09);
      break;
    }
    case 'rim': oscillator('triangle', 820, envelope, .55); oscillator('sine', 1730, envelope, .22); break;
    case 'hat':
    case 'open-hat': {
      const high = filter('highpass', 6500); high.connect(envelope); hiss(high, .7); break;
    }
    case 'hard-lead':
    case 'buzz': {
      const melody=note.instrument==='hard-lead',toneFrequency=melody?frequency/4:frequency;
      const resonance=filter('lowpass',melody?2700:3400,2.4),grit=ctx.createWaveShaper(),curve=new Float32Array(1024);
      for(let i=0;i<1024;i++){const x=i/511.5-1;curve[i]=Math.max(-.68,Math.min(.68,x*3.5));}
      grit.curve=curve;grit.oversample='2x';nodes.push(grit);grit.connect(resonance);resonance.connect(envelope);
      resonance.frequency.setValueAtTime(melody?2700:3200,start);resonance.frequency.exponentialRampToValueAtTime(melody?520:650,start+Math.max(.04,length));
      const saw=oscillator('sawtooth',toneFrequency*.97,grit,.65);saw.frequency.exponentialRampToValueAtTime(toneFrequency,start+.018);
      oscillator('sawtooth',toneFrequency,grit,.35,melody?4:7);oscillator('sawtooth',toneFrequency/2,grit,melody?.22:.14);
      if(melody){
        envelope.gain.cancelScheduledValues(start);envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(note.velocity,start+.004);
        envelope.gain.exponentialRampToValueAtTime(Math.max(.001,note.velocity*.55),start+Math.max(.015,length));envelope.gain.linearRampToValueAtTime(0,end);
      }
      break;
    }
    case 'hard-bass': {
      const drive=ctx.createWaveShaper(),low=filter('lowpass',1600,1.2),curve=new Float32Array(512);
      for(let i=0;i<512;i++)curve[i]=Math.tanh((i/255.5-1)*5)*.6;drive.curve=curve;nodes.push(drive);drive.connect(low);low.connect(envelope);
      oscillator('sawtooth',frequency/2,drive,.5);oscillator('square',frequency/2,drive,.2,-7);
      envelope.gain.cancelScheduledValues(start);envelope.gain.setValueAtTime(.001,start);envelope.gain.linearRampToValueAtTime(note.velocity,start+length*.75);envelope.gain.linearRampToValueAtTime(0,end);break;
    }
    case 'bass': {
      const low = filter('lowpass', 1100, 1.1); low.frequency.exponentialRampToValueAtTime(250, start + length);
      low.connect(envelope); oscillator('sawtooth', frequency, low, .45); oscillator('sine', frequency, envelope, .7); break;
    }
    case 'chord': {
      const brass = filter('lowpass', 2600, .9); brass.connect(envelope);
      brass.frequency.exponentialRampToValueAtTime(650, start + length);
      oscillator('sawtooth', frequency, brass, .5, -9);
      oscillator('sawtooth', frequency, brass, .5, 9);
      break;
    }
    case 'pad': {
      const warm = filter('lowpass', 1450, .5); warm.connect(envelope);
      oscillator('sawtooth', frequency, warm, .5, -7); oscillator('sawtooth', frequency, warm, .5, 7); break;
    }
    case 'pulse': {
      const bite = filter('lowpass', 5200, .8); bite.connect(envelope);
      bite.frequency.exponentialRampToValueAtTime(1700, start + length);
      oscillator('square', frequency, bite, .42, -3);
      oscillator('triangle', frequency * 2, bite, .3, 3);
      break;
    }
    case 'lead': {
      const bright = filter('lowpass', 3300, 1.3); bright.frequency.exponentialRampToValueAtTime(1100, start + length); bright.connect(envelope);
      const main = oscillator('sawtooth', frequency * .985, bright, .52, -5);
      main.frequency.exponentialRampToValueAtTime(frequency, start + .035);
      oscillator('square', frequency, bright, .22, 5); break;
    }
    case 'arp': {
      const sparkle = filter('lowpass', 4600); sparkle.connect(envelope);
      oscillator('square', frequency, sparkle, .42); oscillator('triangle', frequency, sparkle, .35); break;
    }
  }
  let remaining = sources.length;
  const voice: MusicVoice = { stop(at) { for (const source of sources) { try { source.stop(at); } catch { /* Already ended. */ } } } };
  for (const source of sources) {
    source.onended = () => {
      source.disconnect();
      if (--remaining === 0) { for (const node of nodes) node.disconnect(); ended(voice); }
    };
    source.start(start); source.stop(end + .005);
  }
  return voice;
}
