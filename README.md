# Val-d'Aléa

Un jeu web pour apprendre à se préparer aux risques majeurs.

Le joueur vient de rejoindre la réserve communale de sécurité civile de Val-d'Aléa, une commune fictive exposée à de nombreux risques : inondation, retrait-gonflement des argiles, chutes de blocs, cavités souterraines, feu de forêt, accident industriel. Il parcourt la commune, prépare son foyer, aide ses voisins et la mairie, puis affronte l'événement et en tire le bilan.

Le jeu tourne entièrement dans le navigateur : pas de serveur, pas de compte, pas de traceur. La partie est enregistrée dans le navigateur du joueur.

> Projet indépendant, sans lien avec les services de l'État. Il n'en reprend ni la charte ni les logos.

## État d'avancement

Un chapitre est jouable de bout en bout : **l'automne et le risque d'inondation**.

1. **Préparation.** Le maire confie sa première mission au joueur. Un après-midi pour consulter le DICRIM, préparer le kit d'urgence 72 h, les protections de la maison, une zone refuge, convenir d'un abri avec une voisine isolée, vérifier les consignes du camping, préparer le centre d'hébergement. Tout ne tient pas dans l'après-midi : il faut choisir.
2. **Vigilance orange.** Ce qui a été préparé peut être installé ; le reste, il est trop tard.
3. **Crue.** Six décisions à prendre pendant que l'eau monte sur la carte.
4. **Bilan.** Ce qui a tenu, ce qui a été touché, pourquoi, avec la source officielle de chaque consigne. Un indice de préparation et des badges.

Chaque lieu du chapitre a sa vue rapprochée en fausse 3D, qui reflète les gestes accomplis et la hauteur de l'eau.

Les autres risques ne sont pas encore traités.

## Lancer le jeu

Il faut Node.js 22.12 ou plus récent (version paire ; développé avec la version 24).

```sh
npm install
npm run dev        # serveur de développement, sur http://localhost:5173
npm test           # tests unitaires
npm run build      # vérification des types, puis site statique dans dist/
npm run preview    # sert le contenu de dist/ pour le vérifier
npm run liens      # vérifie que les pages officielles citées répondent toujours
```

Le dossier `dist/` se dépose tel quel sur n'importe quel hébergement statique. Les chemins sont relatifs : il fonctionne aussi dans un sous-dossier.

En développement, `window.jcrm` donne accès au jeu depuis la console du navigateur.

## Contenus et sources

Toute consigne de sécurité affichée dans le jeu reprend une page officielle, relue à la source, et la cite. Les personnages, les dates et le déroulé de la crue sont de la fiction.

- `src/content/sources.json` : les pages officielles citées, avec la date de leur dernière relecture.
- `src/content/inondation.ts` : gestes, questions, situations de crise, bilan, bulletins, DICRIM. Chaque élément porte l'identifiant de ses sources.
- `src/content/places.ts` : textes de présentation des lieux (aucune consigne).

Sources du chapitre : Géorisques (« Que faire en cas d'inondation ? », kit d'urgence 72 h, DICRIM, information préventive, vigilance), ministère de la Transition écologique (campagne « Ayons les bons réflexes »), Vigicrues (conseils de comportement par niveau), FR-Alert, plateforme nationale des repères de crues.

Pour modifier une consigne : relire la page officielle, corriger le texte, mettre à jour la date `consulte` de la source. Les tests refusent une consigne sans source.

## Organisation du code

Aucune dépendance à l'exécution : TypeScript, l'API Canvas 2D, SVG et le DOM. Vite et Vitest ne servent qu'au développement.

| Dossier | Rôle |
|---|---|
| `src/core` | Géométrie, état de la partie, sauvegarde, règles du chapitre (phases, temps, bilan). Sans DOM, testable seul. |
| `src/world` | Plan de la commune (`valdalea.ts`), grille de franchissabilité, calcul d'itinéraire, relief et inondation. Sans DOM. |
| `src/content` | Textes et contenus de prévention, séparés du code pour être relus facilement. |
| `src/render` | Dessin du plan, mis en cache par tuiles, nappes d'eau et éléments animés. |
| `src/game` | Boucle de jeu, entrées clavier et pointeur, caméra. |
| `src/ui` | Interface en HTML : barre, fenêtres, téléphone, fiches de lieux, déroulé du chapitre. |
| `src/ui/scenes` | Vues rapprochées des lieux, dessinées en SVG. |
| `tests` | Tests unitaires : règles du chapitre, cohérence des contenus, validité du plan, relief, itinéraires, sauvegarde. |

Unités : 8 unités « monde » valent environ un mètre. Le temps du jeu n'est jamais réel : il n'avance que lorsque le joueur accomplit un geste ou se déplace.

## Accessibilité

Le jeu vise les critères du RGAA :

- l'interface est en HTML sémantique, les fenêtres utilisent l'élément natif `<dialog>` ;
- tout se fait au clavier, et le focus reste visible ;
- la carte et les illustrations ne sont pas indispensables : la liste des lieux et la liste des gestes en sont l'alternative ;
- rien n'est chronométré ;
- aucune information ne repose sur la couleur seule (niveaux de vigilance, états des gestes, résultats du bilan) ;
- les animations se désactivent, et suivent par défaut le réglage du système.

Aucun audit de conformité n'a encore été réalisé.

## Feuille de route

1. **Socle** : carte, déplacement, lieux, téléphone, sauvegarde. *Fait.*
2. **Inondation, de bout en bout** : vues rapprochées, gestes de prévention, vigilance, crue, bilan, DICRIM, premiers badges. *Fait.*
3. **Autres risques naturels et technologiques** : feu de forêt, tempête, accident industriel, argiles, cavités, chutes de blocs ; calendrier des saisons.
4. **Finition** : tutoriel, son, page de ressources officielles, plan individuel de mise en sûreté.
5. **Extensions** : risques sanitaires et sociétaux, mode hors ligne.

## Licence

- Code : [MIT](LICENSE).
- Contenus (textes du jeu, documentation) : [CC BY-SA 4.0](LICENSE-CONTENUS.md).
