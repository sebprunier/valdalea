import type { RadioPlayback, Sound } from '../audio/sound';
import type { Bulletin } from '../content/model';
import { radioClip } from '../content/radio';
import { createDialog } from './dialog';
import { sourceList } from './documents';
import { h, icon } from './dom';

/**
 * La radio à piles du kit d'urgence. Le joueur l'allume lui-même : c'est le
 * réflexe à prendre, et aucune voix ne démarre sans qu'il l'ait demandé.
 *
 * Ce que dit la radio est toujours écrit sous le poste : le texte fait foi, que
 * le son soit coupé, que l'enregistrement manque ou qu'on préfère lire. La voix
 * peut être arrêtée et réécoutée à volonté.
 */
export interface RadioUi {
  /** Fait écouter un bulletin au joueur. Rendu quand il a refermé le poste. */
  listen(bulletin: Bulletin, returnFocus: HTMLElement | null): Promise<void>;
}

export function createRadio(sound: Sound): RadioUi {
  const dialog = createDialog({ id: 'radio', title: "La radio de votre kit d'urgence", className: 'dialog--docked dialog--radio' });
  let playback: RadioPlayback | null = null;
  /** Change à chaque écoute et à chaque arrêt : une voix qui arrive trop tard est ignorée. */
  let turn = 0;

  function silence(): void {
    turn++;
    playback?.stop();
    playback = null;
  }
  dialog.onClose(silence);

  return {
    listen(bulletin, returnFocus) {
      silence();
      const status = h('span', { class: 'radio__status', role: 'status' });
      const toggle = h('button', { type: 'button', class: 'radio__toggle' });
      const next = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer');
      const set = h(
        'div',
        { class: 'radio__set' },
        h('span', { class: 'radio__dial' }, icon('radio')),
        h('span', { class: 'radio__station' }, bulletin.from),
        status,
        // La commande de la voix reste sur le poste, en tête : on l'atteint sans faire défiler le texte.
        toggle,
      );
      const transcript = h(
        'div',
        { class: 'radio__text stack', tabindex: '-1' },
        h('h3', null, bulletin.title),
        ...bulletin.paragraphs.map((text) => h('p', null, text)),
      );

      const say = (text: string, live: boolean): void => {
        status.textContent = text;
        set.classList.toggle('radio__set--live', live);
      };

      async function play(): Promise<void> {
        silence();
        const mine = turn;
        if (!sound.isEnabled) {
          toggle.hidden = true;
          say('Le son du jeu est coupé : voici ce que dit la radio.', false);
          return;
        }
        toggle.disabled = true;
        say('Recherche de la station…', false);
        const started = await sound.playRadio(radioClip(bulletin.id));
        if (mine !== turn) {
          started?.stop();
          return;
        }
        toggle.disabled = false;
        if (!started) {
          toggle.hidden = true;
          say('Le son ne passe pas : voici ce que dit la radio.', false);
          return;
        }
        playback = started;
        toggle.textContent = 'Arrêter la voix';
        say('En direct', true);
        void started.ended.then(() => {
          if (mine !== turn) return;
          playback = null;
          toggle.textContent = 'Réécouter';
          say('Fin du flash', false);
        });
      }

      toggle.addEventListener('click', () => {
        if (playback) {
          silence();
          toggle.textContent = 'Réécouter';
          say('Voix arrêtée', false);
        } else void play();
      });
      next.addEventListener('click', () => dialog.close());

      // D'abord le poste éteint : le joueur l'allume.
      const on = h('button', { type: 'button', class: 'button button--primary' }, 'Allumer la radio');
      on.addEventListener('click', () => {
        dialog.body.replaceChildren(set, transcript, sourceList(bulletin.sources), h('div', { class: 'dialog__actions' }, next));
        // Le texte reçoit le focus : il est lu, ou défilé, sans attendre la voix.
        transcript.focus({ preventScroll: true });
        void play();
      });
      dialog.body.replaceChildren(
        h('p', null, "Votre kit d'urgence est à portée de main. Dedans, une radio à piles : elle donne les consignes des autorités, même sans courant."),
        h('div', { class: 'dialog__actions' }, on),
      );

      return new Promise<void>((resolve) => {
        dialog.onClose(resolve, { once: true });
        dialog.open(returnFocus);
      });
    },
  };
}
