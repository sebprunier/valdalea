import { mulberry32 } from '../core/rng';
import { SILENCE, type Mix } from './mix';

/**
 * Le son du jeu, fabriqué de toutes pièces avec l'API Web Audio : aucun fichier
 * à charger, rien à télécharger. Une ambiance (pluie, vent, rivière) suit la
 * situation ; quelques signaux brefs ponctuent le récit.
 *
 * Le son est un décor : tout ce qu'il dit est aussi écrit à l'écran. Il se coupe
 * d'un bouton, et ne démarre jamais avant un premier geste du joueur.
 *
 * Le signal d'alerte du jeu est inventé. Il ne reproduit pas le vrai signal de
 * FR-Alert : entendu hors du jeu, il ne doit pas pouvoir être pris pour lui.
 */

/** Signaux brefs : le téléphone qui vibre, l'alerte, un geste accompli. */
export type Cue = 'message' | 'alerte' | 'fait';

/** Volume général : une ambiance de fond, pas plus. */
const MASTER = 0.9;

/** Temps que met une nappe à rejoindre son nouveau niveau, en secondes. */
const GLIDE = 0.9;

function noise(ctx: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  const random = mulberry32(1958);
  for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

function gain(ctx: BaseAudioContext, value: number): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

/** Oscillation lente branchée sur un paramètre : c'est elle qui fait vivre le vent et l'eau. */
function sway(ctx: BaseAudioContext, target: AudioParam, hertz: number, depth: number): OscillatorNode {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = hertz;
  const amount = gain(ctx, depth);
  lfo.connect(amount).connect(target);
  lfo.start();
  return lfo;
}

/** Les nappes d'ambiance, chacune avec son réglage de niveau. */
export interface Ambience {
  set(mix: Mix, glide?: number): void;
}

/** Construit l'ambiance et la branche sur `out`. Les nappes tournent en boucle, à niveau nul tant qu'on ne les règle pas. */
export function buildAmbience(ctx: BaseAudioContext, out: AudioNode): Ambience {
  const source = noise(ctx, 4);
  source.start();

  // Pluie : un crépitement aigu, doublé d'un grondement quand elle redouble.
  const patter = gain(ctx, 0);
  source.connect(filter(ctx, 'highpass', 1100)).connect(filter(ctx, 'lowpass', 7500)).connect(patter).connect(out);
  const downpour = gain(ctx, 0);
  source.connect(filter(ctx, 'bandpass', 380, 0.5)).connect(downpour).connect(out);

  // Vent : un souffle grave, dont la couleur et la force ondulent lentement.
  const breath = filter(ctx, 'lowpass', 420, 0.4);
  const gust = gain(ctx, 1);
  const wind = gain(ctx, 0);
  source.connect(breath).connect(gust).connect(wind).connect(out);
  sway(ctx, breath.frequency, 0.07, 170);
  sway(ctx, gust.gain, 0.13, 0.35);

  // Rivière : un bruissement médium ; en crue, un grondement sourd s'y ajoute.
  const ripple = gain(ctx, 1);
  const stream = gain(ctx, 0);
  source.connect(filter(ctx, 'bandpass', 750, 0.8)).connect(filter(ctx, 'lowpass', 2600)).connect(ripple).connect(stream).connect(out);
  sway(ctx, ripple.gain, 0.31, 0.18);
  const rumble = gain(ctx, 0);
  source.connect(filter(ctx, 'lowpass', 190)).connect(rumble).connect(out);

  return {
    set(mix, glide = GLIDE) {
      const now = ctx.currentTime;
      const to = (node: GainNode, value: number): void => {
        if (glide <= 0) node.gain.setValueAtTime(value, now);
        else node.gain.setTargetAtTime(value, now, glide / 3);
      };
      to(patter, 0.2 * mix.rain);
      to(downpour, 0.3 * mix.rain * mix.rain);
      to(wind, 0.5 * mix.wind);
      to(stream, 0.22 * mix.water);
      to(rumble, 0.5 * mix.water * mix.water);
    },
  };
}

interface Note {
  type: OscillatorType;
  hertz: number;
  start: number;
  length: number;
  peak: number;
  /** Fréquence de coupure d'un filtre passe-bas, pour adoucir les ondes riches. */
  soften?: number;
}

function note(ctx: BaseAudioContext, out: AudioNode, at: number, n: Note): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = n.type;
  oscillator.frequency.value = n.hertz;
  const envelope = gain(ctx, 0);
  const begin = at + n.start;
  // Attaque et extinction brèves : pas de clic en début ni en fin de note.
  envelope.gain.setValueAtTime(0, begin);
  envelope.gain.linearRampToValueAtTime(n.peak, begin + 0.012);
  envelope.gain.setValueAtTime(n.peak, begin + Math.max(0.012, n.length - 0.05));
  envelope.gain.linearRampToValueAtTime(0, begin + n.length);
  const body = n.soften ? oscillator.connect(filter(ctx, 'lowpass', n.soften)) : oscillator;
  body.connect(envelope).connect(out);
  oscillator.start(begin);
  oscillator.stop(begin + n.length + 0.02);
}

const SCORES: Record<Cue, Note[]> = {
  // Le téléphone vibre : deux bourdonnements graves.
  message: [0, 0.34].map((start) => ({ type: 'square' as const, hertz: 150, start, length: 0.24, peak: 0.22, soften: 420 })),
  // L'alerte : un motif de trois notes, répété trois fois. Insistant, mais inventé pour le jeu.
  alerte: [0, 0.78, 1.56].flatMap((bar) => [740, 988, 740].map((hertz, i) => ({ type: 'square' as const, hertz, start: bar + i * 0.2, length: 0.17, peak: 0.16, soften: 2400 }))),
  // Un geste accompli : deux notes claires qui montent.
  fait: [
    { type: 'sine', hertz: 660, start: 0, length: 0.13, peak: 0.12 },
    { type: 'sine', hertz: 990, start: 0.11, length: 0.22, peak: 0.1 },
  ],
};

/** Joue un signal bref. Renvoie sa durée, en secondes. */
export function playCue(ctx: BaseAudioContext, out: AudioNode, cue: Cue, at = ctx.currentTime): number {
  const score = SCORES[cue];
  for (const n of score) note(ctx, out, at, n);
  return Math.max(...score.map((n) => n.start + n.length));
}

/** Sortie commune : le volume général, puis un limiteur qui écarte toute saturation. */
export function buildOutput(ctx: BaseAudioContext): { input: GainNode } {
  const input = gain(ctx, MASTER);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.005;
  limiter.release.value = 0.2;
  input.connect(limiter).connect(ctx.destination);
  return { input };
}

/** Le son du jeu en cours de partie. */
export class Sound {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private ambience: Ambience | null = null;
  private mix: Mix = SILENCE;
  /** Le joueur a agi sur la page : le navigateur accepte désormais de produire du son. */
  private unlocked = false;

  constructor(private enabled: boolean) {
    document.addEventListener('visibilitychange', () => this.refresh());
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** À appeler depuis un geste du joueur (clic, touche) : avant, les navigateurs refusent tout son. */
  unlock(): void {
    this.unlocked = true;
    this.refresh();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.refresh();
  }

  /** Règle l'ambiance ; le changement est progressif. */
  setMix(mix: Mix): void {
    this.mix = mix;
    this.ambience?.set(mix);
  }

  play(cue: Cue): void {
    if (!this.enabled || !this.ctx || !this.output || this.ctx.state !== 'running') return;
    playCue(this.ctx, this.output, cue);
  }

  /** Démarre, reprend ou suspend le son selon le réglage, le premier geste et la visibilité de la page. */
  private refresh(): void {
    const wanted = this.enabled && this.unlocked && document.visibilityState === 'visible';
    if (!wanted) {
      if (this.ctx?.state === 'running') void this.ctx.suspend();
      return;
    }
    if (!this.ctx) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      // Navigateur sans Web Audio : le jeu reste muet, sans rien casser.
      if (!Context) return;
      this.ctx = new Context();
      this.output = buildOutput(this.ctx).input;
      this.ambience = buildAmbience(this.ctx, this.output);
      // L'ambiance arrive en douceur.
      this.ambience.set(SILENCE, 0);
      this.ambience.set(this.mix, 2.5);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }
}
