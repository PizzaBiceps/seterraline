import { STEP_SECONDS } from './composition';

/** One shared stereo effects rack, rather than a delay/reverb per note. */
export interface MusicMix {
  music: GainNode;
  drums: GainNode;
  master: GainNode;
  duck(at: number, amount: number): void;
}

export function createMusicMix(ctx: BaseAudioContext): MusicMix {
  const music = ctx.createGain(), drums = ctx.createGain(), master = ctx.createGain();
  const tone = ctx.createBiquadFilter(), compressor = ctx.createDynamicsCompressor();
  tone.type = 'lowpass'; tone.frequency.value = 7200; tone.Q.value = .55;
  compressor.threshold.value = -15; compressor.knee.value = 14; compressor.ratio.value = 3;
  compressor.attack.value = .004; compressor.release.value = .18;
  music.connect(tone); tone.connect(compressor); drums.connect(compressor);
  compressor.connect(master); master.connect(ctx.destination); master.gain.value = 0;

  // Alternating stereo echoes, filtered on every repeat for a soft tape-like tail.
  const left = ctx.createDelay(1), right = ctx.createDelay(1), feedback = ctx.createGain();
  const echoTone = ctx.createBiquadFilter(), echoSend = ctx.createGain();
  const leftPan = ctx.createStereoPanner(), rightPan = ctx.createStereoPanner();
  left.delayTime.value = STEP_SECONDS * 3; right.delayTime.value = STEP_SECONDS * 3;
  feedback.gain.value = .28; echoSend.gain.value = .18;
  echoTone.type = 'lowpass'; echoTone.frequency.value = 2400;
  leftPan.pan.value = -.7; rightPan.pan.value = .7;
  tone.connect(echoSend); echoSend.connect(left); left.connect(leftPan); leftPan.connect(compressor);
  left.connect(right); right.connect(rightPan); rightPan.connect(compressor);
  right.connect(echoTone); echoTone.connect(feedback); feedback.connect(left);

  // Short stereo room: deterministic impulse, allocated once per context.
  const room = ctx.createConvolver(), roomSend = ctx.createGain();
  const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 1.35), ctx.sampleRate);
  let bits = 0x9e3779b9;
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < data.length; i++) {
      bits ^= bits << 13; bits ^= bits >>> 17; bits ^= bits << 5;
      smooth = smooth * .65 + ((bits >>> 0) / 2147483648 - 1) * .35;
      data[i] = i < ctx.sampleRate * .018 ? 0 : smooth * (1 - i / data.length) ** 2.8;
    }
  }
  room.buffer = impulse; roomSend.gain.value = .15;
  tone.connect(roomSend); roomSend.connect(room); room.connect(compressor);
  return {
    music, drums, master,
    duck(at, amount) {
      music.gain.cancelScheduledValues(at);
      music.gain.setValueAtTime(1, at);
      music.gain.linearRampToValueAtTime(1 - amount, at + .008);
      music.gain.exponentialRampToValueAtTime(1, at + STEP_SECONDS * 1.6);
    },
  };
}

export const MUSIC_GAIN = .72;
