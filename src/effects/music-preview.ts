import { SOUNDTRACKS, type SoundtrackId } from './soundtracks';
import { MUSIC_BPM, STEP_SECONDS, stepOffset } from './composition';
import { createMusicNoise, synthesizeNote } from './synth';
import { createMusicMix, MUSIC_GAIN } from './music-mix';

export interface ShowcaseStage { label: string; detail: string; start: number; end: number; bpm: number }
/** Four bars per level; final level gets the full eight-bar call-and-response. */
export async function renderShowcase(track: SoundtrackId = 'neon-drive'): Promise<{ wav: Uint8Array; stages: ShowcaseStage[]; duration: number; peak: number }> {
  const soundtrack = SOUNDTRACKS[track];
  const stages: ShowcaseStage[] = [];
  let time = .1;
  for (let level = 0; level < 5; level++) {
    const start = time;
    time += (level === 4 ? 8 : 4) * 16 * STEP_SECONDS;
    stages.push({ label: soundtrack.stages[level], detail: soundtrack.details[level], start, end: time, bpm: MUSIC_BPM });
  }
  const sampleRate = 44100, duration = time + 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const mix = createMusicMix(ctx);
  mix.master.gain.setValueAtTime(0, 0); mix.master.gain.linearRampToValueAtTime(MUSIC_GAIN, .55);
  mix.master.gain.setValueAtTime(MUSIC_GAIN, time); mix.master.gain.linearRampToValueAtTime(0, time + 1.8);
  const noise = createMusicNoise(ctx);
  let barIndex = 0;
  for (let level = 0; level < 5; level++) {
    for (let bar = 0; bar < (level === 4 ? 8 : 4); bar++, barIndex++) {
      for (const note of soundtrack.compose(20261021, barIndex, level)) {
        synthesizeNote(ctx, mix, noise, note, stages[level].start + bar * 16 * STEP_SECONDS + stepOffset(note.step), STEP_SECONDS);
      }
    }
  }
  const result = await ctx.startRendering();
  const channels = [result.getChannelData(0), result.getChannelData(1)], length = result.length;
  let peak = 0;
  for (const channel of channels) for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  // Export the actual game mix, with headroom intact, so the audition is representative.
  const buffer = new ArrayBuffer(44 + length * 4), data = new DataView(buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) data.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); data.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true); data.setUint32(24, sampleRate, true);
  data.setUint32(28, sampleRate * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true); text(36, 'data'); data.setUint32(40, length * 4, true);
  for (let i = 0; i < length; i++) for (let ch = 0; ch < 2; ch++) {
    const value = Math.max(-1, Math.min(1, channels[ch][i]));
    data.setInt16(44 + (i * 2 + ch) * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return { wav: new Uint8Array(buffer), stages, duration, peak };
}
