# Val-d'Aléa

Un jeu web pour apprendre à se préparer aux risques majeurs.

Le joueur vient de rejoindre la réserve communale de sécurité civile de Val-d'Aléa, une commune fictive exposée à de nombreux risques : inondation, retrait-gonflement des argiles, chutes de blocs, cavités souterraines, feu de forêt, accident industriel. Il parcourt la commune et, à terme, aide ses habitants et sa mairie à s'y préparer.

Le jeu tourne entièrement dans le navigateur : pas de serveur, pas de compte, pas de traceur. La partie est enregistrée dans le navigateur du joueur.

> Projet indépendant, sans lien avec les services de l'État. Il n'en reprend ni la charte ni les logos.

## État d'avancement

**Jalon 1, la découverte de la commune**, est jouable :

- la carte de Val-d'Aléa, dessinée en code (aucune image) ;
- le déplacement au clavier, à la souris ou au doigt, avec calcul d'itinéraire ;
- douze lieux à découvrir, chacun avec sa fiche ;
- la liste des lieux, qui permet de jouer sans la carte ;
- le téléphone : plan de la commune, carnet des lieux visités, réglages ;
- la sauvegarde automatique.

Il n'y a pas encore de contenu de prévention : il arrive au jalon 2.

## Lancer le jeu

Il faut Node.js 22.12 ou plus récent (version paire ; développé avec la version 24).

```sh
npm install
npm run dev        # serveur de développement, sur http://localhost:5173
npm test           # tests unitaires
npm run build      # vérification des types, puis site statique dans dist/
npm run preview    # sert le contenu de dist/ pour le vérifier
```

Le dossier `dist/` se dépose tel quel sur n'importe quel hébergement statique. Les chemins sont relatifs : il fonctionne aussi dans un sous-dossier.

En développement, `window.jcrm` donne accès au jeu depuis la console du navigateur.

## Organisation du code

Aucune dépendance à l'exécution : TypeScript, l'API Canvas 2D et le DOM. Vite et Vitest ne servent qu'au développement.

| Dossier | Rôle |
|---|---|
| `src/core` | Géométrie, état de la partie, sauvegarde. Sans DOM, testable seul. |
| `src/world` | Plan de la commune (`valdalea.ts`), grille de franchissabilité, calcul d'itinéraire. Sans DOM. |
| `src/content` | Textes du jeu, séparés du code pour être relus facilement. |
| `src/render` | Dessin du plan, mis en cache par tuiles, et des éléments animés. |
| `src/game` | Boucle de jeu, entrées clavier et pointeur, caméra. |
| `src/ui` | Interface en HTML : barre, fenêtres, téléphone. |
| `tests` | Tests unitaires, dont la validation du plan (rien sur les routes, tous les lieux accessibles à pied). |

Unités : 8 unités « monde » valent environ un mètre.

## Principes

**Des contenus sourcés.** Toute consigne de sécurité affichée dans le jeu devra citer sa source officielle, vérifiée sur la page d'origine, et être relue avant publication.

**Accessibilité.** Le jeu vise les critères du RGAA :

- l'interface est en HTML sémantique, les fenêtres utilisent l'élément natif `<dialog>` ;
- tout se fait au clavier, et le focus reste visible ;
- la carte n'est pas indispensable : la liste des lieux en est l'alternative ;
- aucune information ne repose sur la couleur seule ;
- les animations se désactivent, et suivent par défaut le réglage du système.

Aucun audit de conformité n'a encore été réalisé.

**Sobriété.** Environ 27 Ko à télécharger, compression comprise. Polices du système, aucune ressource externe.

## Feuille de route

1. **Socle** : carte, déplacement, lieux, téléphone, sauvegarde. *Fait.*
2. **Inondation, de bout en bout** : vue rapprochée des lieux, gestes de prévention, vigilance, crue, déclenchement du plan communal de sauvegarde, retour d'expérience, DICRIM en mairie, premiers badges.
3. **Autres risques naturels et technologiques** : feu de forêt, tempête, accident industriel, argiles, cavités, chutes de blocs ; calendrier des saisons.
4. **Finition** : indice de résilience, badges, tutoriel, son, page de ressources officielles, vérification automatique des liens.
5. **Extensions** : risques sanitaires et sociétaux, mode hors ligne.

## Licence

- Code : [MIT](LICENSE).
- Contenus (textes du jeu, documentation) : [CC BY-SA 4.0](LICENSE-CONTENUS.md).
