import type { ActionDef, Beat, Bulletin, ChapterContent, CrisisScript, SkyId, StoryCard, VigilanceLevel } from '../content/model';
import { answer, assess, currentSituation, isTimeUp, nextPhase, type Assessment, type Chapter, type Phase } from '../core/chapter';
import { createDialog, type DialogHandle } from './dialog';
import { bilanContent, mountQuestion } from './documents';
import { h } from './dom';

/**
 * Déroulé du chapitre : moments de récit, bulletins, passage d'une phase à
 * l'autre, séquence de crise et bilan. C'est ici que le récit s'enchaîne ; les
 * règles, elles, sont dans `core/chapter`, et ce qui est raconté vient du script
 * du chapitre (`CrisisScript`) : la crue comme le feu se jouent de la même façon.
 *
 * Aucune alerte n'arrive sans prévenir : un moment de récit la précède, pendant
 * lequel le joueur voit le ciel changer, l'eau monter ou le feu avancer sur la
 * carte. Messages et alertes se lisent dans le téléphone, là où ils resteront.
 * Rien n'avance tout seul : c'est le joueur qui passe à la suite.
 */

/** Ce que la barre d'état et la carte montrent pendant un moment de récit, à la place de l'état de la phase. */
export interface Scene {
  vigilance: VigilanceLevel;
  sky: SkyId;
  /** Jour, heure et titre du moment, affichés à la place de la mission. */
  caption: string;
}

export interface FlowDeps {
  getChapter(): Chapter;
  /** Le chapitre en cours : son récit d'ouverture, ses horaires, et s'il se joue jusqu'au bout. */
  getContent(): ChapterContent | null;
  /** Quitte le chapitre sans bilan, quand sa suite n'existe pas encore. */
  leaveChapter(): void;
  setChapter(recipe: (chapter: Chapter) => Chapter): void;
  getBadges(): readonly string[];
  addBadges(ids: readonly string[]): void;
  /** Recommence le chapitre, en gardant les badges. */
  replay(): void;
  /** Ouvre la liste des chapitres, dans le téléphone. */
  openChapters(): void;
  /** Ferme la fiche de lieu si elle est ouverte. */
  closePlace(): void;
  /** Amène le joueur dans un lieu, sans trajet. */
  goTo(placeId: string): void;
  /** Montre le danger sur la carte, à ce niveau : la crue ou le feu, selon le chapitre. */
  setHazard(level: number, immediate?: boolean): void;
  /** Braque la caméra sur un lieu pendant une séquence, décalée de `south` unités vers le sud ; `null` la rend au joueur. */
  setFocus(placeId: string | null, south?: number): void;
  /** Met en scène un moment de récit ; `null` revient à l'état normal de la phase. */
  stage(scene: Scene | null): void;
  /**
   * Fait lire un message ou une alerte au joueur, dans son téléphone : la messagerie
   * pour l'un, l'application Alertes pour l'autre. Rendu quand il a refermé.
   */
  readBulletin(bulletin: Bulletin): Promise<void>;
  /** Fait entendre le signal d'un moment de récit. */
  play(cue: 'message' | 'alerte'): void;
  /** Élément qui reprend le focus à la fin d'une séquence. */
  focusTarget: HTMLElement;
  announce(message: string): void;
}

/** Ce que le joueur choisit en refermant le bilan. */
type AfterBilan = 'rejouer' | 'chapitres' | null;

export interface Flow {
  /** Le joueur vient de choisir un chapitre : le récit l'ouvre. */
  begin(): void;
  /** Vérifie si le temps de la phase est écoulé et, si oui, lance la suite. Renvoie vrai si une séquence démarre. */
  check(): boolean;
  /** Une séquence du récit est en cours (bulletin, crise, bilan). */
  isBusy(): boolean;
  /** Le joueur vient de terminer une action. Renvoie vrai si une séquence démarre. */
  afterAction(action: ActionDef): boolean;
  /** Reprise d'une partie sauvegardée : relance la séquence qui était en cours. */
  resume(): void;
  /** Niveau du danger à montrer sur la carte pour l'état actuel du chapitre : hauteur de la crue, ou avancée du feu. */
  hazardLevel(): number;
  /** Bulletins reçus jusqu'ici, du plus récent au plus ancien. */
  bulletins(): Bulletin[];
  /** Bilan du chapitre, s'il est terminé. */
  assessment(): Assessment | null;
}

function closed(dialog: DialogHandle): Promise<void> {
  return new Promise((resolve) => {
    if (!dialog.isOpen) resolve();
    else dialog.onClose(resolve, { once: true });
  });
}

export function createFlow(deps: FlowDeps): Flow {
  let busy = false;
  /** La vigilance, la crise et le bilan du chapitre en cours, s'il les a. */
  const script = (): CrisisScript | null => deps.getContent()?.crisis ?? null;

  // ------------------------------------------------------------- Fenêtres
  // Certains navigateurs ferment une fenêtre modale au second appui sur Échap, quoi qu'on demande.
  // Tant que le joueur doit y répondre, les fenêtres du récit et de la crise sont donc rouvertes.
  const storyDialog = createDialog({ id: 'recit', title: '', className: 'dialog--docked dialog--story', closable: false });
  let telling = false;
  storyDialog.onClose(() => {
    if (telling) storyDialog.open(deps.focusTarget);
  });

  const sceneOf = (card: StoryCard): Scene => ({ vigilance: card.vigilance, sky: card.sky, caption: `${card.when} — ${card.title}` });

  /**
   * Raconte un moment. La fenêtre est ancrée en bas de l'écran : au-dessus, la
   * carte montre le ciel et la rivière de ce moment-là. `late` : la phase
   * précédente s'est achevée faute de temps.
   */
  async function tell(card: StoryCard, late = false): Promise<void> {
    deps.stage(sceneOf(card));
    const paragraphs = late && card.late ? [card.late, ...card.paragraphs.slice(1)] : card.paragraphs;
    const next = h('button', { type: 'button', class: 'button button--primary' }, card.next);
    storyDialog.setTitle(card.title);
    storyDialog.body.replaceChildren(h('p', { class: 'dialog__kicker' }, card.when), ...paragraphs.map((text) => h('p', null, text)), h('div', { class: 'dialog__actions' }, next));
    telling = true;
    if (storyDialog.isOpen) storyDialog.focusTitle();
    else storyDialog.open(deps.focusTarget);
    if (card.sound) deps.play(card.sound);
    await new Promise<void>((resolve) => next.addEventListener('click', () => resolve(), { once: true }));
    telling = false;
  }

  const crisisDialog = createDialog({ id: 'crise', title: '', className: 'dialog--docked', closable: false });
  let deciding = false;
  crisisDialog.onClose(() => {
    if (deciding) crisisDialog.open(deps.focusTarget);
  });
  const bilanDialog = createDialog({ id: 'bilan', title: 'Bilan', className: 'dialog--wide' });

  // ------------------------------------------------------------ Séquences

  function hazardLevel(): number {
    const crisis = script();
    if (!crisis) return 0;
    const chapter = deps.getChapter();
    const [from, to] = crisis.levels.vigilance;
    if (chapter.phase === 'vigilance') {
      // Pendant la vigilance, le danger grandit avec l'heure qui tourne.
      const total = deps.getContent()?.timing.vigilance.minutes ?? 0;
      const elapsed = total > 0 ? Math.min(1, Math.max(0, 1 - chapter.minutesLeft / total)) : 1;
      return from + (to - from) * elapsed;
    }
    if (chapter.phase === 'crise') {
      // Pendant la crise, il est au niveau de la dernière situation traitée.
      const reached = crisis.situations.filter((situation) => situation.id in chapter.answers);
      return reached.length > 0 ? reached[reached.length - 1].hazard : to;
    }
    return chapter.phase === 'bilan' ? crisis.levels.after : 0;
  }

  /**
   * Enchaîne les temps d'un récit : moments racontés et messages reçus.
   * @param late la phase précédente s'est achevée faute de temps : le premier moment le dit
   */
  async function play(beats: readonly Beat[], late: boolean): Promise<void> {
    let last: Scene | null = null;
    let first = true;
    for (const beat of beats) {
      if ('tell' in beat) {
        // Le danger change pendant que le joueur lit : il le voit avant que le message suivant ne l'annonce.
        if (beat.hazard !== undefined) deps.setHazard(beat.hazard);
        await tell(beat.tell, late && first);
        first = false;
        last = sceneOf(beat.tell);
      } else {
        storyDialog.close();
        deps.stage(beat.vigilance && last ? { ...last, vigilance: beat.vigilance } : null);
        await deps.readBulletin(beat.bulletin);
      }
    }
    storyDialog.close();
  }

  /**
   * Lance la séquence d'entrée dans la phase en cours.
   * @param late la phase précédente s'est achevée faute de temps, et non par décision du joueur
   */
  async function enter(phase: Phase, late = false): Promise<void> {
    if (busy) return;
    busy = true;
    let then: AfterBilan = null;
    try {
      deps.closePlace();
      const content = deps.getContent();
      const crisis = content?.crisis;
      if (phase === 'preparation') {
        // Le chapitre s'ouvre sur la mission que confie le maire.
        if (content) await tell(content.opening);
        storyDialog.close();
      } else if (!crisis) {
        // La suite du chapitre n'est pas encore écrite : on l'annonce, et l'on rend la main.
        if (content?.toBeContinued) await tell(content.toBeContinued);
        storyDialog.close();
        deps.leaveChapter();
        then = 'chapitres';
      } else if (phase === 'vigilance') {
        deps.goTo(crisis.places.vigilance);
        deps.setFocus(crisis.places.vigilance, crisis.lookSouth);
        await play(crisis.vigilance, late);
        deps.stage(null);
        deps.setHazard(hazardLevel());
        deps.setFocus(null);
        deps.announce(crisis.ready);
      } else if (phase === 'crise') {
        then = await runCrisis(crisis, late);
      } else if (phase === 'bilan') {
        then = await showBilan(crisis, true);
      }
    } finally {
      busy = false;
      deps.stage(null);
    }
    // Une fois la séquence refermée seulement : rejouer en ouvre une autre.
    if (then === 'rejouer') deps.replay();
    else if (then === 'chapitres') deps.openChapters();
  }

  async function runCrisis(crisis: CrisisScript, late: boolean): Promise<AfterBilan> {
    const { situations } = crisis;
    deps.goTo(crisis.places.crise);
    deps.setFocus(crisis.places.crise, crisis.lookSouth);
    if (currentSituation(deps.getChapter(), situations) === situations[0]) {
      await play(crisis.onset, late);
      deps.stage(null);
    } else {
      deps.setHazard(hazardLevel(), true);
    }

    deciding = true;
    for (;;) {
      const situation = currentSituation(deps.getChapter(), situations);
      if (!situation) break;
      const index = situations.indexOf(situation);
      deps.setHazard(situation.hazard);
      crisisDialog.setTitle(`${crisis.name} — décision ${index + 1} sur ${situations.length}`);
      await new Promise<void>((resolve) => {
        mountQuestion(crisisDialog.body, situation, {
          tone: 'crise',
          onAnswer: (chosen) => deps.setChapter((chapter) => answer(chapter, situation.id, chosen[0])),
          onContinue: resolve,
        });
        if (crisisDialog.isOpen) crisisDialog.focusTitle();
        else crisisDialog.open(deps.focusTarget);
      });
    }
    deciding = false;
    crisisDialog.close();
    // Le dénouement : le danger retombe, puis vient le bilan.
    deps.setHazard(crisis.levels.ending);
    await tell(crisis.ending);
    storyDialog.close();
    deps.setChapter((chapter) => nextPhase(chapter, deps.getContent()?.timing));
    deps.stage(null);
    return showBilan(crisis, true);
  }

  async function showBilan(crisis: CrisisScript, firstTime: boolean): Promise<AfterBilan> {
    const result = assess(deps.getChapter(), crisis);
    const earned = result.badges.map((badge) => badge.id);
    const fresh = earned.filter((id) => !deps.getBadges().includes(id));
    if (firstTime) deps.addBadges(earned);
    deps.setHazard(crisis.levels.after);
    deps.setFocus(firstTime ? crisis.places.crise : null, crisis.lookSouth);

    const again = h('button', { type: 'button', class: 'button' }, 'Rejouer ce chapitre');
    const others = h('button', { type: 'button', class: 'button' }, 'Autres chapitres');
    const explore = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer à explorer');
    let choice: AfterBilan = null;
    again.addEventListener('click', () => {
      choice = 'rejouer';
      bilanDialog.close();
    });
    others.addEventListener('click', () => {
      choice = 'chapitres';
      bilanDialog.close();
    });
    explore.addEventListener('click', () => bilanDialog.close());
    bilanDialog.setTitle(crisis.bilan.title);
    bilanDialog.body.replaceChildren(h('p', { class: 'lead' }, crisis.bilan.lead), bilanContent(result, crisis.badges, deps.getBadges(), fresh), h('div', { class: 'dialog__actions' }, again, others, explore));
    bilanDialog.open(deps.focusTarget);
    await closed(bilanDialog);
    deps.setFocus(null);
    return choice;
  }

  function check(): boolean {
    const chapter = deps.getChapter();
    if (busy || !isTimeUp(chapter)) return false;
    deps.setChapter((chapter) => nextPhase(chapter, deps.getContent()?.timing));
    void enter(deps.getChapter().phase, true);
    return true;
  }

  return {
    begin: () => void enter('preparation'),
    check,
    hazardLevel,
    isBusy: () => busy,

    afterAction(action) {
      if (action.endsPhase && action.phase !== 'accueil') {
        void enter(deps.getChapter().phase);
        return true;
      }
      return check();
    },

    resume() {
      const chapter = deps.getChapter();
      deps.setHazard(hazardLevel(), true);
      if (chapter.phase === 'crise') void enter('crise');
      else check();
    },

    bulletins() {
      const crisis = script();
      if (!crisis) return [];
      const phase = deps.getChapter().phase;
      const messages = (beats: readonly Beat[]): Bulletin[] => beats.flatMap((beat) => ('bulletin' in beat ? [beat.bulletin] : [])).reverse();
      const received: Bulletin[] = [];
      if (phase === 'crise' || phase === 'bilan') received.push(...messages(crisis.onset));
      if (phase === 'vigilance' || phase === 'crise' || phase === 'bilan') received.push(...messages(crisis.vigilance));
      return received;
    },

    assessment() {
      const crisis = script();
      return crisis && deps.getChapter().phase === 'bilan' ? assess(deps.getChapter(), crisis) : null;
    },
  };
}
