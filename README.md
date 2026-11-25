# Val-d'Aléa

Un jeu web pour apprendre à se préparer aux risques majeurs.

Le joueur vient de rejoindre la réserve communale de sécurité civile de Val-d'Aléa, une commune fictive exposée à de nombreux risques : inondation, retrait-gonflement des argiles, chutes de blocs, cavités souterraines, feu de forêt, accident industriel. Il parcourt la commune, prépare son foyer, aide ses voisins et la mairie, puis affronte l'événement et en tire le bilan.

Le jeu tourne entièrement dans le navigateur : pas de serveur, pas de compte, pas de traceur. La partie est enregistrée dans le navigateur du joueur.

> Projet indépendant, sans lien avec les services de l'État. Il n'en reprend ni la charte ni les logos.

## État d'avancement

Un chapitre est jouable de bout en bout : **l'automne et le risque d'inondation**.

1. **Préparation.** Le maire confie sa première mission au joueur : consulter le DICRIM, préparer le kit d'urgence 72 h, les protections de la maison, une zone refuge, convenir d'un abri avec une voisine isolée, lire le repère de crue, vérifier les consignes du camping, préparer le centre d'hébergement. La journée ne se termine que lorsque tout est fait, ou que la nuit tombe.
2. **Vigilance orange.** Ce qui a été préparé peut être installé ; le reste, il est trop tard.
3. **Crue.** Six décisions à prendre pendant que l'eau monte sur la carte.
4. **Bilan.** Ce qui a tenu, ce qui a été touché, pourquoi, avec la source officielle de chaque consigne. Un indice de préparation et des badges.

Autour de ce chapitre :

- **Le DICRIM de Val-d'Aléa**, un vrai document à feuilleter : mot du maire, un chapitre et une carte par risque (inondation, chutes de blocs, cavités, argiles, feu de forêt, risque industriel), l'alerte, une page mémo. Chaque carte peut s'afficher sur le plan du jeu.
- **Le carnet de mission**, qui liste les gestes de la journée, dit par où commencer et y conduit. Sur la carte, des flèches pointent vers les lieux où il reste quelque chose à faire.
- **Le lexique**, qui explique les mots de la prévention (batardeau, zone refuge, PCS…), schémas à l'appui.
- **Les vues rapprochées** des lieux, en fausse 3D, qui reflètent les gestes accomplis et la hauteur de l'eau.

Les autres risques sont cartographiés et décrits dans le DICRIM, mais pas encore jouables.

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
- `src/content/inondation.ts` : gestes, questions, situations de crise, bilan, bulletins. Chaque élément porte l'identifiant de ses sources.
- `src/content/dicrim.ts` : le DICRIM. Ce qui décrit la commune est inventé ; les phénomènes et les bons réflexes reprennent les pages officielles.
- `src/content/lexique.ts` : les définitions du lexique.
- `src/content/places.ts` : textes de présentation des lieux (aucune consigne).

Sources : Géorisques (fiches « Que faire en cas de… » pour l'inondation, le feu de forêt et l'accident industriel ; fiches risques ; kit d'urgence 72 h ; DICRIM ; information préventive ; vigilance ; obligations de débroussaillement), ministère de la Transition écologique (campagne « Ayons les bons réflexes »), Vigicrues (conseils de comportement par niveau), FR-Alert, plateforme nationale des repères de crues.

Pour modifier une consigne : relire la page officielle, corriger le texte, mettre à jour la date `consulte` de la source. Les tests refusent une consigne sans source.

## Organisation du code

Aucune dépendance à l'exécution : TypeScript, l'API Canvas 2D, SVG et le DOM. Vite et Vitest ne servent qu'au développement.

| Dossier | Rôle |
|---|---|
| `src/core` | Géométrie, état de la partie, sauvegarde, règles du chapitre (phases, temps, bilan). Sans DOM, testable seul. |
| `src/world` | Plan de la commune (`valdalea.ts`), grille de franchissabilité, calcul d'itinéraire, relief et inondation, zones de risque. Sans DOM. |
| `src/content` | Textes et contenus de prévention, séparés du code pour être relus facilement. |
| `src/render` | Dessin du plan, mis en cache par tuiles, cartes de risques, nappes d'eau et éléments animés. |
| `src/game` | Boucle de jeu, entrées clavier et pointeur, caméra. |
| `src/ui` | Interface en HTML : barre, fenêtres, téléphone, fiches de lieux, carnet de mission, DICRIM, schémas, déroulé du chapitre. |
| `src/ui/scenes` | Vues rapprochées des lieux, dessinées en SVG. |
| `tests` | Tests unitaires : règles du chapitre, cohérence des contenus, validité du plan, relief, itinéraires, sauvegarde. |

Unités : une unité « monde » vaut un mètre. La commune fait 4,2 km sur 3 ; les bâtiments sont grossis, comme sur un plan schématique. Le temps du jeu n'est jamais réel : il n'avance que lorsque le joueur accomplit un geste ou se déplace, à 6 km/h.

## Accessibilité

Le jeu vise les critères du RGAA :

- l'interface est en HTML sémantique, les fenêtres utilisent l'élément natif `<dialog>` ;
- tout se fait au clavier, et le focus reste visible ;
- la carte et les illustrations ne sont pas indispensables : la liste des lieux, le carnet de mission et la liste des gestes en sont l'alternative, et chaque carte de risque est décrite en toutes lettres ;
- rien n'est chronométré ;
- aucune information ne repose sur la couleur seule (niveaux de vigilance, zones des cartes, états des gestes, résultats du bilan) ;
- les animations se désactivent, et suivent par défaut le réglage du système.

Aucun audit de conformité n'a encore été réalisé.

## Feuille de route

1. **Socle** : carte, déplacement, lieux, téléphone, sauvegarde. *Fait.*
2. **Inondation, de bout en bout** : vues rapprochées, gestes de prévention, vigilance, crue, bilan, DICRIM complet, carnet de mission, premiers badges. *Fait.*
3. **Autres risques naturels et technologiques** : rendre jouables le feu de forêt, l'accident industriel, les argiles, les cavités et les chutes de blocs, déjà cartographiés ; tempête ; calendrier des saisons.
4. **Finition** : tutoriel, son, page de ressources officielles, plan individuel de mise en sûreté.
5. **Extensions** : risques sanitaires et sociétaux, mode hors ligne.

## Licence

- Code : [MIT](LICENSE).
- Contenus (textes du jeu, documentation) : [CC BY-SA 4.0](LICENSE-CONTENUS.md).
