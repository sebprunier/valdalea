import { BADGES, BULLETIN_JAUNE, BULLETIN_ORANGE, BULLETIN_ROUGE, FLOOD, SITUATIONS, STAKES } from '../content/inondation';
import type { ActionDef, Bulletin } from '../content/model';
import { answer, assess, currentSituation, isTimeUp, nextPhase, type Assessment, type Chapter, type Phase } from '../core/chapter';
import type { Vec } from '../core/geometry';
import { createDialog, type DialogHandle } from './dialog';
import { bilanContent, bulletinContent, mountQuestion } from './documents';
import { h } from './dom';

/**
 * Déroulé du chapitre : bulletins, passage d'une phase à l'autre, séquence de
 * crise et bilan. C'est ici que le récit s'enchaîne ; les règles, elles, sont
 * dans `core/chapter`.
 */

export interface FlowDeps {
  getChapter(): Chapter;
  setChapter(recipe: (chapter: Chapter) => Chapter): void;
  getBadges(): readonly string[];
  addBadges(ids: readonly string[]): void;
  /** Affiche la carte de la zone inondable sur le plan du jeu. */
  showFloodZone(): void;
  /** Ouvre le DICRIM. */
  openDicrim(returnFocus: HTMLElement | null): void;
  /** Recommence le chapitre, en gardant les badges. */
  replay(): void;
  /** Ferme la fiche de lieu si elle est ouverte. */
  closePlace(): void;
  /** Ramène le joueur chez lui. */
  goHome(): void;
  setFlood(level: number, immediate?: boolean): void;
  setFocus(point: Vec | null): void;
  /**
   * Niveau de vigilance à afficher le temps d'un bulletin qui précède la phase
   * en cours (la vigilance jaune du samedi soir) ; `null` revient à l'affichage normal.
   */
  showVigilance(level: 'jaune' | null): void;
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

  const crisisDialog = createDialog({ id: 'crise', title: '', className: 'dialog--docked', closable: false });
  // Certains navigateurs ferment une fenêtre modale au second appui sur Échap, quoi qu'on demande.
  // Tant qu'une décision est attendue, la fenêtre de crise est donc rouverte.
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

  /** Lance la séquence d'entrée dans la phase en cours. */
  async function enter(phase: Phase): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      deps.closePlace();
      if (phase === 'vigilance') {
        deps.showVigilance('jaune');
        await showBulletin(BULLETIN_JAUNE);
        deps.showVigilance(null);
        deps.goHome();
        deps.setFlood(FLOOD.rising);
        await showBulletin(BULLETIN_ORANGE);
        deps.announce('Vigilance orange. Vous êtes chez vous.');
      } else if (phase === 'crise') {
        await runCrisis();
      } else if (phase === 'bilan') {
        await showBilan(true);
      }
    } finally {
      busy = false;
    }
  }

  async function runCrisis(): Promise<void> {
    deps.goHome();
    deps.setFocus(deps.crisisFocus);
    const first = currentSituation(deps.getChapter(), SITUATIONS);
    if (first === SITUATIONS[0]) {
      deps.setFlood(FLOOD.rising);
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
          continueLabel: index + 1 < SITUATIONS.length ? 'Continuer' : 'Voir le bilan',
        });
        if (crisisDialog.isOpen) crisisDialog.focusTitle();
        else crisisDialog.open(deps.focusTarget);
      });
    }
    deciding = false;
    crisisDialog.close();
    await closed(crisisDialog);
    deps.setChapter(nextPhase);
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
    deps.announce(chapter.phase === 'preparation' ? 'La nuit tombe.' : "L'eau monte : vous rentrez vous mettre à l'abri.");
    deps.setChapter(nextPhase);
    void enter(deps.getChapter().phase);
    return true;
  }

  return {
    check,
    floodLevel,
    isBusy: () => busy,

    afterAction(action) {
      if (action.id === 'mairie-dicrim') {
        deps.showFloodZone();
        deps.openDicrim(null);
        return true;
      }
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
