import type { Mix } from './mix';
import { buildAmbience, buildOutput, playCue, type Cue } from './sound';

/**
 * Banc de mesure, pour le développement uniquement : rend un son hors ligne et
 * en donne le niveau. Il ne dit pas si le son est agréable ; il dit s'il existe,
 * et s'il sature.
 */
export interface Level {
  /** Niveau moyen (valeur efficace), de 0 à 1. */
  rms: number;
  /** Crête, de 0 à 1 : au-delà, le son sature. */
  peak: number;
  seconds: number;
}

async function measure(seconds: number, build: (ctx: OfflineAudioContext, out: AudioNode) => void): Promise<Level> {
  const rate = 44100;
  const ctx = new OfflineAudioContext(1, Math.round(rate * seconds), rate);
  build(ctx, buildOutput(ctx).input);
  const samples = (await ctx.startRendering()).getChannelData(0);
  let sum = 0;
  let peak = 0;
  for (const sample of samples) {
    sum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { rms: Math.sqrt(sum / samples.length), peak, seconds };
}

export const soundLab = {
  cue: (cue: Cue): Promise<Level> => measure(3, (ctx, out) => void playCue(ctx, out, cue, 0.05)),
  ambience: (mix: Mix): Promise<Level> => measure(6, (ctx, out) => buildAmbience(ctx, out).set(mix, 0)),
};
