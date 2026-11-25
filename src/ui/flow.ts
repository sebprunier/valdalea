import { BADGES, BULLETIN_JAUNE, BULLETIN_ORANGE, BULLETIN_ROUGE, FLOOD, SITUATIONS, STAKES, STORY } from '../content/inondation';
import type { ActionDef, Bulletin, SkyId, StoryCard, VigilanceLevel } from '../content/model';
import { answer, assess, currentSituation, isTimeUp, nextPhase, type Assessment, type Chapter, type Phase } from '../core/chapter';
import type { Vec } from '../core/geometry';
import { createDialog, type DialogHandle } from './dialog';
import { bilanContent, bulletinContent, mountQuestion } from './documents';
import { h } from './dom';

/**
 * Déroulé du chapitre : moments de récit, bulletins, passage d'une phase à
 * l'autre, séquence de crise et bilan. C'est ici que le récit s'enchaîne ; les
 * règles, elles, sont dans `core/chapter`.
 *
 * Aucune alerte n'arrive sans prévenir : un moment de récit la précède, pendant
 * lequel le joueur voit le ciel changer et l'eau monter sur la carte. Rien
 * n'avance tout seul : c'est lui qui passe à la suite.
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
  setChapter(recipe: (chapter: Chapter) => Chapter): void;
  getBadges(): readonly string[];
  addBadges(ids: readonly string[]): void;
  /** Recommence le chapitre, en gardant les badges. */
  replay(): void;
  /** Ferme la fiche de lieu si elle est ouverte. */
  closePlace(): void;
  /** Ramène le joueur chez lui. */
  goHome(): void;
  setFlood(level: number, immediate?: boolean): void;
  setFocus(point: Vec | null): void;
  /** Met en scène un moment de récit ; `null` revient à l'état normal de la phase. */
  stage(scene: Scene | null): void;
  /** Fait entendre le signal d'un moment de récit. */
  play(cue: 'message' | 'alerte'): void;
  /** Point de la carte à montrer pendant la crue. */
  crisisFocus: Vec;
  /** Élément qui reprend le focus à la fin d'une séquence. */
  focusTarget: HTMLElement;
  announce(message: string): void;
}

export interface Flow {
  /** Vérifie si le temps de la phase est écoulé et, si oui, lance la suite. Renvoie vrai si une séquence démarre. */
  check(): boolean;
  /** Une séquence du récit est en cours (bulletin, crise, bilan). */
  isBusy(): boolean;
  /** Le joueur vient de terminer une action. Renvoie vrai si une séquence démarre. */
  afterAction(action: ActionDef): boolean;
  /** Reprise d'une partie sauvegardée : relance la séquence qui était en cours. */
  resume(): void;
  /** Niveau de la crue à afficher pour l'état actuel du chapitre. */
  floodLevel(): number;
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
  const content = { stakes: STAKES, badges: BADGES, situations: SITUATIONS };
  let busy = false;

  // ------------------------------------------------------------- Fenêtres
  const bulletinDialog = createDialog({ id: 'bulletin', title: '', className: 'dialog--alert' });
  const bulletinBody = h('div');
  const bulletinOk = h('button', { type: 'button', class: 'button button--primary' }, 'Compris');
  bulletinOk.addEventListener('click', () => bulletinDialog.close());
  bulletinDialog.body.append(bulletinBody, h('div', { class: 'dialog__actions' }, bulletinOk));

  async function showBulletin(bulletin: Bulletin): Promise<void> {
    bulletinDialog.setTitle(bulletin.title);
    bulletinBody.replaceChildren(bulletinContent(bulletin));
    bulletinDialog.open(deps.focusTarget);
    await closed(bulletinDialog);
  }

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
  const bilanDialog = createDialog({ id: 'bilan', title: 'Bilan de la crue', className: 'dialog--wide' });

  // ------------------------------------------------------------ Séquences

  function floodLevel(): number {
    const chapter = deps.getChapter();
    if (chapter.phase === 'vigilance') return FLOOD.rising;
    if (chapter.phase !== 'crise') return 0;
    // Pendant la crise, l'eau est au niveau de la dernière situation traitée.
    const reached = SITUATIONS.filter((situation) => situation.id in chapter.answers);
    return reached.length > 0 ? reached[reached.length - 1].floodLevel : FLOOD.rising;
  }

  /**
   * Lance la séquence d'entrée dans la phase en cours.
   * @param late la phase précédente s'est achevée faute de temps, et non par décision du joueur
   */
  async function enter(phase: Phase, late = false): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      deps.closePlace();
      if (phase === 'vigilance') {
        // Samedi soir, la nuit de dimanche, lundi matin : trois moments, deux bulletins.
        deps.goHome();
        deps.setFocus(deps.crisisFocus);
        await tell(STORY.soir, late);
        storyDialog.close();
        deps.stage({ ...sceneOf(STORY.soir), vigilance: 'jaune' });
        await showBulletin(BULLETIN_JAUNE);
        await tell(STORY.nuit);
        deps.setFlood(FLOOD.rising);
        await tell(STORY.matin);
        storyDialog.close();
        deps.stage(null);
        await showBulletin(BULLETIN_ORANGE);
        deps.setFocus(null);
        deps.announce('Vigilance orange. Vous êtes chez vous.');
      } else if (phase === 'crise') {
        await runCrisis(late);
      } else if (phase === 'bilan') {
        await showBilan(true);
      }
    } finally {
      busy = false;
      deps.stage(null);
    }
  }

  async function runCrisis(late: boolean): Promise<void> {
    deps.goHome();
    deps.setFocus(deps.crisisFocus);
    const first = currentSituation(deps.getChapter(), SITUATIONS);
    if (first === SITUATIONS[0]) {
      // L'eau franchit le quai pendant que le joueur lit : il la voit avant que l'alerte ne sonne.
      deps.setFlood(SITUATIONS[0].floodLevel);
      await tell(STORY.abri, late);
      storyDialog.close();
      deps.stage(null);
      await showBulletin(BULLETIN_ROUGE);
    } else {
      deps.setFlood(floodLevel(), true);
    }

    deciding = true;
    for (;;) {
      const situation = currentSituation(deps.getChapter(), SITUATIONS);
      if (!situation) break;
      const index = SITUATIONS.indexOf(situation);
      deps.setFlood(situation.floodLevel);
      crisisDialog.setTitle(`La crue — décision ${index + 1} sur ${SITUATIONS.length}`);
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
    // La décrue : la pluie cesse, l'eau se retire, puis vient le bilan.
    deps.setFlood(FLOOD.receding);
    await tell(STORY.decrue);
    storyDialog.close();
    deps.setChapter(nextPhase);
    deps.stage(null);
    await showBilan(true);
  }

  async function showBilan(firstTime: boolean): Promise<void> {
    const result = assess(deps.getChapter(), content);
    const earned = result.badges.map((badge) => badge.id);
    const fresh = earned.filter((id) => !deps.getBadges().includes(id));
    if (firstTime) deps.addBadges(earned);
    deps.setFlood(0);
    deps.setFocus(firstTime ? deps.crisisFocus : null);

    const again = h('button', { type: 'button', class: 'button' }, "Rejouer l'automne");
    const explore = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer à explorer');
    let replay = false;
    again.addEventListener('click', () => {
      replay = true;
      bilanDialog.close();
    });
    explore.addEventListener('click', () => bilanDialog.close());
    bilanDialog.body.replaceChildren(
      h('p', { class: 'lead' }, "En fin de journée, la Follette regagne son lit. Voici ce que la crue a laissé derrière elle, et ce que votre préparation a changé."),
      bilanContent(result, BADGES, deps.getBadges(), fresh),
      h('div', { class: 'dialog__actions' }, again, explore),
    );
    bilanDialog.open(deps.focusTarget);
    await closed(bilanDialog);
    deps.setFocus(null);
    if (replay) deps.replay();
  }

  function check(): boolean {
    const chapter = deps.getChapter();
    if (busy || !isTimeUp(chapter)) return false;
    deps.setChapter(nextPhase);
    void enter(deps.getChapter().phase, true);
    return true;
  }

  return {
    check,
    floodLevel,
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
      deps.setFlood(floodLevel(), true);
      if (chapter.phase === 'crise') void enter('crise');
      else check();
    },

    bulletins() {
      const phase = deps.getChapter().phase;
      const received: Bulletin[] = [];
      if (phase === 'crise' || phase === 'bilan') received.push(BULLETIN_ROUGE);
      if (phase === 'vigilance' || phase === 'crise' || phase === 'bilan') received.push(BULLETIN_ORANGE, BULLETIN_JAUNE);
      return received;
    },

    assessment() {
      return deps.getChapter().phase === 'bilan' ? assess(deps.getChapter(), content) : null;
    },
  };
}
