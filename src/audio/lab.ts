import type { Mix } from './mix';
import { mulberry32 } from '../core/rng';
import { birdsong, buildAmbience, buildOutput, playCue, schoolBell, SONGS, toll, type Cue } from './sound';

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
  /** Les trois chants d'oiseaux, à la suite, au plus près de la forêt. */
  birds: (): Promise<Level> =>
    measure(6, (ctx, out) => {
      const random = mulberry32(7);
      SONGS.forEach((song, i) => void birdsong(ctx, out, 0.1 + i * 1.8, song, 1, random));
    }),
  church: (strokes: number): Promise<Level> => measure(strokes * 1.5 + 2, (ctx, out) => void toll(ctx, out, 0.05, strokes, 1)),
  school: (): Promise<Level> => measure(2.2, (ctx, out) => void schoolBell(ctx, out, 0.05, 1)),
};
