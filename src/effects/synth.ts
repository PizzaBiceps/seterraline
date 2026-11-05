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
  const percussion = ['kick', 'snare', 'rim', 'hat', 'open-hat'].includes(note.instrument);
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
