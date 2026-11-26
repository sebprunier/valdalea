import { mulberry32 } from '../core/rng';
import { duck, SILENCE, UNDER_VOICE, type Mix } from './mix';

/**
 * Le son du jeu, fabriqué de toutes pièces avec l'API Web Audio : aucun fichier
 * à charger, rien à télécharger. Une ambiance suit la situation : le temps qu'il
 * fait (pluie, vent) et les lieux proches (rivière, forêt et ses oiseaux, usine).
 * Quelques signaux brefs ponctuent le récit, et une cloche prévient quand le temps presse.
 *
 * Le son est un décor : tout ce qu'il dit est aussi écrit à l'écran. Il se coupe
 * d'un bouton, et ne démarre jamais avant un premier geste du joueur.
 *
 * Le signal d'alerte du jeu est inventé. Il ne reproduit pas le vrai signal de
 * FR-Alert : entendu hors du jeu, il ne doit pas pouvoir être pris pour lui.
 */

/** Signaux brefs du récit : le téléphone qui vibre, l'alerte. */
export type Cue = 'message' | 'alerte';

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

/**
 * Crépitements : une boucle de petits claquements secs, irréguliers, chacun
 * s'éteignant en quelques millisecondes. C'est le bois qui éclate dans le feu.
 */
function crackle(ctx: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  const random = mulberry32(2022);
  let at = 0;
  while (at < samples.length) {
    const length = Math.round(ctx.sampleRate * (0.004 + random() * 0.018));
    const level = 0.25 + random() * 0.75;
    for (let i = 0; i < length && at + i < samples.length; i++) samples[at + i] += (random() * 2 - 1) * level * Math.exp((-6 * i) / length);
    // Tantôt en rafale, tantôt espacés.
    at += Math.round(ctx.sampleRate * (random() < 0.6 ? 0.02 + random() * 0.06 : 0.12 + random() * 0.3));
  }
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

  // Vent : un souffle grave, dont la couleur et la force ondulent lentement. Absent par temps calme.
  const breath = filter(ctx, 'lowpass', 420, 0.4);
  const gust = gain(ctx, 1);
  const wind = gain(ctx, 0);
  source.connect(breath).connect(gust).connect(wind).connect(out);
  sway(ctx, breath.frequency, 0.07, 170);
  sway(ctx, gust.gain, 0.13, 0.35);

  // Feuillages : un froissement aigu et léger, qui va et vient.
  const rustle = gain(ctx, 1);
  const leaves = gain(ctx, 0);
  source.connect(filter(ctx, 'bandpass', 3200, 0.5)).connect(filter(ctx, 'highpass', 1800)).connect(rustle).connect(leaves).connect(out);
  sway(ctx, rustle.gain, 0.23, 0.4);
  sway(ctx, rustle.gain, 0.09, 0.3);

  // Usine : un ronronnement grave, une ventilation, et une cadence de machine.
  const cadence = gain(ctx, 1);
  const industry = gain(ctx, 0);
  for (const [hertz, level] of [
    [100, 0.5],
    [150, 0.22],
    [200, 0.12],
  ] as const) {
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = hertz;
    hum.connect(filter(ctx, 'lowpass', 420)).connect(gain(ctx, level)).connect(cadence);
    hum.start();
  }
  source.connect(filter(ctx, 'bandpass', 270, 1.1)).connect(gain(ctx, 0.9)).connect(cadence);
  cadence.connect(industry).connect(out);
  sway(ctx, cadence.gain, 1.7, 0.22);

  // Rivière : un bruissement médium ; en crue, un grondement sourd s'y ajoute.
  const ripple = gain(ctx, 1);
  const stream = gain(ctx, 0);
  source.connect(filter(ctx, 'bandpass', 750, 0.8)).connect(filter(ctx, 'lowpass', 2600)).connect(ripple).connect(stream).connect(out);
  sway(ctx, ripple.gain, 0.31, 0.18);
  const rumble = gain(ctx, 0);
  source.connect(filter(ctx, 'lowpass', 190)).connect(rumble).connect(out);

  // Feu de forêt : un souffle grave et continu, qui enfle par vagues, et le bois qui crépite.
  const blaze = gain(ctx, 1);
  const roar = gain(ctx, 0);
  source.connect(filter(ctx, 'lowpass', 520, 0.5)).connect(filter(ctx, 'highpass', 60)).connect(blaze).connect(roar).connect(out);
  sway(ctx, blaze.gain, 0.17, 0.3);
  const sparks = gain(ctx, 0);
  const pops = crackle(ctx, 5);
  pops.connect(filter(ctx, 'highpass', 900)).connect(filter(ctx, 'lowpass', 6500)).connect(sparks).connect(out);
  pops.start();

  return {
    set(mix, glide = GLIDE) {
      const now = ctx.currentTime;
      const to = (node: GainNode, value: number): void => {
        if (glide <= 0) node.gain.setValueAtTime(value, now);
        else node.gain.setTargetAtTime(value, now, glide / 3);
      };
      to(patter, 0.2 * mix.rain);
      to(downpour, 0.3 * mix.rain * mix.rain);
      // La rivière sert de repère : le vent, les feuillages et l'usine restent en dessous d'elle.
      to(wind, 0.13 * mix.wind);
      to(stream, 0.22 * mix.water);
      to(rumble, 0.5 * mix.water * mix.water);
      to(leaves, 0.07 * mix.leaves);
      to(industry, 0.09 * mix.industry);
      // Au plus fort, le feu s'entend autant que la rivière en crue.
      to(roar, 0.5 * mix.fire);
      to(sparks, 0.26 * mix.fire);
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
};

/** Joue un signal bref. Renvoie sa durée, en secondes. */
export function playCue(ctx: BaseAudioContext, out: AudioNode, cue: Cue, at = ctx.currentTime): number {
  const score = SCORES[cue];
  for (const n of score) note(ctx, out, at, n);
  return Math.max(...score.map((n) => n.start + n.length));
}

// --------------------------------------------------------------- Oiseaux

/** Une note d'oiseau : un sifflement pur dont la hauteur glisse. */
function chirp(ctx: BaseAudioContext, out: AudioNode, at: number, from: number, to: number, length: number, peak: number): void {
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(from, at);
  oscillator.frequency.exponentialRampToValueAtTime(to, at + length);
  const envelope = gain(ctx, 0);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(peak, at + Math.min(0.02, length / 3));
  envelope.gain.linearRampToValueAtTime(0, at + length);
  oscillator.connect(envelope).connect(out);
  oscillator.start(at);
  oscillator.stop(at + length + 0.02);
}

/** Trois chants, sans prétention ornithologique : deux notes alternées, une phrase flûtée, une ritournelle qui descend. */
export const SONGS = ['deux-notes', 'flute', 'ritournelle'] as const;
export type Song = (typeof SONGS)[number];

/** Fait chanter un oiseau. `random` fournit les variations ; renvoie la durée de la phrase. */
export function birdsong(ctx: BaseAudioContext, out: AudioNode, at: number, song: Song, level: number, random: () => number): number {
  const peak = 0.05 * level * (0.5 + 0.5 * random());
  let t = at;
  if (song === 'deux-notes') {
    const high = 3900 + random() * 500;
    const repeats = 2 + Math.floor(random() * 2);
    for (let i = 0; i < repeats; i++) {
      chirp(ctx, out, t, high, high * 0.98, 0.09, peak);
      chirp(ctx, out, t + 0.13, high * 0.8, high * 0.78, 0.11, peak);
      t += 0.3;
    }
  } else if (song === 'flute') {
    const notes = 3 + Math.floor(random() * 3);
    for (let i = 0; i < notes; i++) {
      const from = 1800 + random() * 900;
      const length = 0.14 + random() * 0.12;
      chirp(ctx, out, t, from, from * (0.85 + random() * 0.4), length, peak * 1.2);
      t += length + 0.04 + random() * 0.08;
    }
  } else {
    const notes = 6 + Math.floor(random() * 3);
    for (let i = 0; i < notes; i++) {
      const from = 4600 - i * 280;
      chirp(ctx, out, t, from, from * 0.9, 0.055, peak);
      t += 0.075;
    }
  }
  return t - at;
}

// ---------------------------------------------------------------- Cloches

/** Un coup de cloche : des partiels qui ne sont pas des harmoniques exacts, et qui s'éteignent chacun à son rythme. */
function strike(ctx: BaseAudioContext, out: AudioNode, at: number, hertz: number, peak: number, ring: number): void {
  const partials = [
    [0.5, 0.45, 1],
    [1, 1, 0.8],
    [1.19, 0.55, 0.6],
    [1.5, 0.3, 0.5],
    [2, 0.45, 0.45],
    [2.74, 0.18, 0.3],
  ] as const;
  for (const [ratio, level, life] of partials) {
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = hertz * ratio;
    const envelope = gain(ctx, 0);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(peak * level, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + ring * life);
    oscillator.connect(envelope).connect(out);
    oscillator.start(at);
    oscillator.stop(at + ring * life + 0.05);
  }
}

/** La cloche : `strokes` coups espacés, d'autant plus nombreux que le temps presse. Renvoie la durée totale. */
export function toll(ctx: BaseAudioContext, out: AudioNode, at: number, strokes: number, level: number): number {
  for (let i = 0; i < strokes; i++) strike(ctx, out, at + i * 1.5, 311, 0.2 * level, 2.6);
  return (strokes - 1) * 1.5 + 2.6;
}


/** Un choc métallique bref, de temps en temps, du côté de l'usine. */
export function clank(ctx: BaseAudioContext, out: AudioNode, at: number, level: number): void {
  strike(ctx, out, at, 620, 0.05 * level, 0.25);
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
/** Un bulletin en cours de diffusion : on peut l'arrêter, et savoir quand il s'achève. */
export interface RadioPlayback {
  stop(): void;
  ended: Promise<void>;
}

/**
 * Fait passer une voix enregistrée par un petit poste à piles : une bande de
 * fréquences étroite, un peu de saturation, et un grésillement qui s'installe
 * avec un craquement au moment où l'on allume. Renvoie la durée de l'ensemble.
 */
export function playThroughRadio(ctx: BaseAudioContext, out: AudioNode, voice: AudioBuffer, at: number): { stop(): void; duration: number } {
  const lead = 0.45;
  const tail = 0.35;
  const end = at + lead + voice.duration + tail;
  // Le niveau du poste : la voix passe nettement au-dessus de l'ambiance, sans couvrir les signaux du jeu.
  const master = gain(ctx, 1);
  master.connect(gain(ctx, 0.6)).connect(out);

  // La voix : le grave et l'aigu coupés, le médium en avant, un peu écrêtée.
  const source = ctx.createBufferSource();
  source.buffer = voice;
  const presence = filter(ctx, 'peaking', 1700, 1);
  presence.gain.value = 5;
  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(257);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(2.2 * (i / 128 - 1)) / Math.tanh(2.2);
  drive.curve = curve;
  source.connect(filter(ctx, 'highpass', 340)).connect(filter(ctx, 'lowpass', 3100)).connect(presence).connect(drive).connect(gain(ctx, 0.85)).connect(master);
  source.start(at + lead);

  // Le grésillement : fort au moment où l'on allume, puis en fond, qui ondule un peu.
  const hiss = noise(ctx, 2);
  const level = gain(ctx, 0);
  level.gain.setValueAtTime(0.16, at);
  level.gain.exponentialRampToValueAtTime(0.028, at + lead);
  const flutter = sway(ctx, level.gain, 0.7, 0.008);
  hiss.connect(filter(ctx, 'bandpass', 2400, 0.5)).connect(level).connect(master);
  hiss.start(at);
  hiss.stop(end);
  flutter.stop(end);
  master.gain.setValueAtTime(1, end - 0.12);
  master.gain.linearRampToValueAtTime(0, end);

  return {
    duration: end - at,
    stop() {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.06);
      for (const node of [source, hiss, flutter]) {
        try {
          node.stop(now + 0.08);
        } catch {
          // Déjà arrêté.
        }
      }
    },
  };
}

export class Sound {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private ambience: Ambience | null = null;
  private mix: Mix = SILENCE;
  /** Bulletins de radio en cours de diffusion : tant qu'il y en a, l'ambiance reste en retrait. */
  private voices = 0;
  /** Le joueur a agi sur la page : le navigateur accepte désormais de produire du son. */
  private unlocked = false;

  constructor(private enabled: boolean) {
    document.addEventListener('visibilitychange', () => this.refresh());
    // Les sons épars (un oiseau, un choc à l'usine) sont tirés au sort, quelques fois par seconde.
    window.setInterval(() => this.scatter(), 450);
  }

  private get live(): { ctx: AudioContext; out: GainNode } | null {
    return this.enabled && this.ctx && this.output && this.ctx.state === 'running' ? { ctx: this.ctx, out: this.output } : null;
  }

  private scatter(): void {
    const live = this.live;
    if (!live) return;
    const { birds, industry } = this.mix;
    // En forêt, un chant toutes les deux secondes environ ; en lisière, de loin en loin.
    if (birds > 0.05 && Math.random() < 0.24 * birds) {
      const song = SONGS[Math.floor(Math.random() * SONGS.length)];
      birdsong(live.ctx, live.out, live.ctx.currentTime + 0.05, song, birds, Math.random);
    }
    if (industry > 0.1 && Math.random() < 0.09) clank(live.ctx, live.out, live.ctx.currentTime + 0.05, industry);
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
    this.ambience?.set(this.voices > 0 ? duck(mix, UNDER_VOICE) : mix);
  }

  /** Une voix commence (`+1`) ou s'achève (`-1`) : l'ambiance s'efface devant elle, puis revient. */
  private voice(change: 1 | -1): void {
    this.voices = Math.max(0, this.voices + change);
    this.ambience?.set(this.voices > 0 ? duck(this.mix, UNDER_VOICE) : this.mix, change > 0 ? 0.5 : 1.2);
  }

  play(cue: Cue): void {
    const live = this.live;
    if (live) playCue(live.ctx, live.out, cue);
  }

  /**
   * Diffuse un bulletin de radio enregistré. Rend `null` si le son est coupé, ou si
   * l'enregistrement n'existe pas ou ne se lit pas : le texte, lui, reste affiché.
   */
  async playRadio(url: string): Promise<RadioPlayback | null> {
    if (!this.enabled) return null;
    let voice: AudioBuffer;
    try {
      // Le joueur vient d'allumer le poste : c'est un geste, le son peut démarrer s'il ne l'avait pas fait.
      this.unlock();
      if (this.ctx && this.ctx.state !== 'running' && document.visibilityState === 'visible') await this.ctx.resume();
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.arrayBuffer();
      const live = this.live;
      if (!live) return null;
      voice = await live.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
    const live = this.live;
    if (!live) return null;
    const playing = playThroughRadio(live.ctx, live.out, voice, live.ctx.currentTime + 0.05);
    this.voice(1);
    let over = false;
    let resolve = (): void => undefined;
    const ended = new Promise<void>((done) => {
      resolve = done;
    });
    const finish = (): void => {
      if (over) return;
      over = true;
      this.voice(-1);
      resolve();
    };
    const timer = window.setTimeout(finish, playing.duration * 1000);
    return {
      ended,
      stop() {
        window.clearTimeout(timer);
        playing.stop();
        finish();
      },
    };
  }

  /** La cloche qui prévient que le temps presse. `level` : de 0 à 1. */
  toll(strokes: number, level: number): void {
    const live = this.live;
    if (live && level > 0.02) toll(live.ctx, live.out, live.ctx.currentTime + 0.05, strokes, level);
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
