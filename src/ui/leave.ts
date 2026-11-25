/**
 * Garde-fou contre le « retour » involontaire du navigateur (bouton, raccourci,
 * glissement à deux doigts) : au lieu de quitter le jeu, on demande confirmation.
 *
 * Le principe : une entrée d'historique est ajoutée devant la page. Un retour
 * ramène alors sur la page elle-même, sans la quitter ; on y revient d'un pas en
 * avant, et on pose la question. Rien n'empêche de partir : il suffit de confirmer.
 * Fermer l'onglet ou recharger la page ne demande rien, la partie étant enregistrée.
 */
export function guardBack(confirmLeave: () => Promise<boolean>): void {
  // Rien derrière cette page : le retour est déjà impossible.
  if (window.history.length <= 1) return;

  const isOurs = (state: unknown): boolean => typeof state === 'object' && state !== null && (state as Record<string, unknown>).valdalea === 'jeu';
  let leaving = false;
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
