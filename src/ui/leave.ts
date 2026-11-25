/**
 * Garde-fous contre les départs involontaires : on ne quitte pas le jeu sans
 * qu'une confirmation soit demandée. Rien n'empêche de partir : il suffit de
 * confirmer.
 */

/** Le départ est voulu (le joueur l'a confirmé, ou la page se recharge d'elle-même) : on ne redemande rien. */
let leaving = false;

/**
 * Le « retour » du navigateur (bouton, raccourci, glissement à deux doigts) : au
 * lieu de quitter le jeu, on pose la question dans notre propre fenêtre.
 *
 * Le principe : une entrée d'historique est ajoutée devant la page. Un retour
 * ramène alors sur la page elle-même, sans la quitter ; on y revient d'un pas en
 * avant, et on pose la question.
 */
export function guardBack(confirmLeave: () => Promise<boolean>): void {
  // Rien derrière cette page : le retour est déjà impossible.
  if (window.history.length <= 1) return;

  const isOurs = (state: unknown): boolean => typeof state === 'object' && state !== null && (state as Record<string, unknown>).valdalea === 'jeu';
  let asking = false;

  // Les navigateurs ignorent, pour le bouton Retour, une entrée ajoutée sans geste
  // de l'utilisateur : la garde se met en place à son premier clic ou appui de touche.
  const arm = (): void => {
    if (!isOurs(window.history.state)) window.history.pushState({ valdalea: 'jeu' }, '');
  };
  window.addEventListener('click', arm, { once: true, capture: true });
  window.addEventListener('keydown', arm, { once: true, capture: true });

  window.addEventListener('popstate', (event) => {
    if (leaving || isOurs(event.state)) return;
    window.history.forward();
    if (asking) return;
    asking = true;
    void confirmLeave().then((leave) => {
      asking = false;
      if (!leave) return;
      leaving = true;
      window.history.go(-2);
    });
  });
}

/**
 * La fermeture de l'onglet, le rechargement de la page, le départ vers un autre
 * site : le navigateur demande alors confirmation avant de quitter.
 *
 * C'est sa fenêtre et son texte, pas les nôtres : une page ne peut ni les écrire,
 * ni les remplacer par les siens. Il ne la montre que si le joueur a déjà agi sur
 * la page, et certains navigateurs de téléphone ne la montrent jamais.
 *
 * @param isPlaying la partie a commencé ; avant, on laisse partir sans rien demander
 */
export function guardUnload(isPlaying: () => boolean): void {
  window.addEventListener('beforeunload', (event) => {
    if (leaving || !isPlaying()) return;
    event.preventDefault();
    // Pour les navigateurs plus anciens, c'est cette valeur qui déclenche la question.
    event.returnValue = true;
  });
  // En développement, la page se recharge d'elle-même à chaque modification du code : ce n'est pas un départ.
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
      leaving = true;
    });
  }
}
