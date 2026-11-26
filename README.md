# Val-d'Aléa

Un jeu web pour apprendre à se préparer aux risques majeurs.

Le joueur vient de rejoindre la réserve communale de sécurité civile de Val-d'Aléa, une commune fictive exposée à de nombreux risques : inondation, retrait-gonflement des argiles, chutes de blocs, cavités souterraines, feu de forêt, accident industriel. Il parcourt la commune, prépare son foyer, aide ses voisins et la mairie, puis affronte l'événement et en tire le bilan.

Le jeu tourne entièrement dans le navigateur : pas de serveur, pas de compte, pas de traceur. La partie est enregistrée dans le navigateur du joueur.

> Projet indépendant, sans lien avec les services de l'État. Il n'en reprend ni la charte ni les logos.

**Jouer : <https://www.valdalea.fr>** (version de travail, mise à jour à chaque évolution).

## État d'avancement

La partie s'ouvre sur un **prologue** : rencontrer le maire, puis lire le DICRIM. Le joueur choisit ensuite ses **chapitres** dans le téléphone, application Chapitres : un par risque majeur, dans l'ordre qu'il veut ; un chapitre est conseillé pour commencer, aucun n'est imposé. Le chapitre en cours est rappelé en haut de l'écran.

Deux chapitres sont jouables de bout en bout : **La crue de la Follette** (inondation), conseillé pour commencer, et **Le feu des Brandes** (feu de forêt), qui se joue sur deux saisons. Au printemps : expliquer l'obligation de débroussailler, débroussailler le terrain d'un voisin sur le dessin, rappeler les gestes qui évitent les départs de feu, vérifier le chemin d'accès au hameau et l'aire de barbecue du camping. L'été : un feu arrive par le massif et avance sur la carte, poussé par le vent. Le maire fait évacuer le hameau : une après-midi pour aider les habitants à partir et préparer les maisons, puis l'on quitte le massif avec un voisin âgé, jusqu'au gymnase, centre d'accueil. Six décisions jalonnent l'évacuation : partir sans attendre, n'emporter que son sac, donner l'alerte pour un nouveau départ de feu, ne pas quitter la voiture dans la fumée, limiter ses appels, ne pas revenir avant l'autorisation. Ce qui a été débroussaillé au printemps ne brûle pas : le bilan en dépend.

Le chapitre de l'inondation se déroule ainsi, et celui du feu sur le même modèle :

1. **Préparation.** Le maire confie sa mission au joueur : préparer le kit d'urgence 72 h, les protections de la maison, une zone refuge, demander un diagnostic de vulnérabilité, convenir d'un abri avec une voisine isolée, lire le repère de crue, demander comment l'école se met en sûreté, vérifier les consignes du camping, préparer le centre d'hébergement. La journée se termine quand le joueur le décide — une confirmation lui rappelle les gestes encore faisables — ou à la tombée de la nuit.
2. **Vigilance orange.** Ce qui a été préparé peut être installé ; le reste, il est trop tard.
3. **Crue.** Six décisions à prendre pendant que l'eau monte sur la carte.
4. **Bilan.** Ce qui a tenu, ce qui a été touché, pourquoi, avec la source officielle de chaque consigne. Un indice de préparation et des badges.

Le **kit d'urgence 72 heures** sert pour tous les risques : le joueur le prépare dans le premier chapitre qu'il joue, quel qu'il soit, et le vérifie dans les suivants. Il peut aussi le préparer chez lui hors chapitre ; une fois prêt, sa fiche « Chez vous » en montre le contenu, d'après la liste officielle.

Autour des chapitres :

- **Le récit entre les phases** : aucune alerte n'arrive sans prévenir. Un court moment de récit la précède, pendant lequel le joueur voit le soir tomber, la pluie arriver et l'eau monter sur la carte. Les messages de la mairie et les alertes s'ouvrent dans le téléphone, où ils restent. Rien n'avance tout seul : c'est lui qui passe à la suite.
- **La barre d'état** : sous le nom de la commune, le temps qu'il fait et le niveau de vigilance (pour le feu, le niveau de danger de la Météo des forêts), qui ouvrent le téléphone à la bonne application : la météo, ou les alertes reçues et les quatre niveaux de vigilance ; à côté des autres boutons, celui de la mission, qui dit toujours quoi faire ensuite, avec le temps restant et l'avancement.
- **Le DICRIM de Val-d'Aléa**, un vrai document : couverture, mot des élus, sommaire, un chapitre et une carte par risque (inondation, chutes de blocs, cavités, argiles, feu de forêt, risque industriel), l'alerte, une page mémo. Il est mis en pages comme une brochure, en feuilles A4 numérotées, et s'imprime ou s'enregistre en PDF tel quel ; chaque page rappelle qu'il s'agit d'un document fictif. Chaque carte peut s'afficher sur le plan du jeu.
- **La légende de la carte** (bouton en bas à gauche, touche G) : ce que représentent les couleurs et les motifs du plan, et les repères posés dessus.
- **Le carnet de mission**, ouvert depuis le bandeau, qui liste les gestes de la journée, dit par où commencer et y conduit. Sur la carte, des flèches pointent vers les lieux où il reste quelque chose à faire.
- **Le téléphone**, télécommande du jeu : chapitres (chacun garde son bilan et ses badges une fois mené au bout), carte, lieux (on s'y rend d'un geste, sans la carte), météo et prévisions, messages de la mairie, vigilance et alertes, DICRIM, lexique, badges (ceux des chapitres et ceux de toute la partie : kit prêt, tous les lieux visités, tous les chapitres achevés), réglages, et « À propos » (auteur, code source, licences, origine des consignes, données du joueur). Une pastille y signale ce qui vient d'arriver.
- **Le déplacement** : au clavier (flèches ou ZQSD, Maj pour courir), en désignant un point de la carte, que le personnage rejoint par les rues, ou, sur un écran tactile, avec la manette en bas de l'écran. Vers un point éloigné, le personnage court de lui-même. L'aide (touche H) rappelle les commandes, celles du clavier ou celles du tactile selon l'appareil.
- **Le zoom** de la carte, sur quatre niveaux : touches + et -, molette, pincement, ou boutons.
- **Le son** : une ambiance qui suit le temps qu'il fait (pluie, vent quand il se lève), les lieux proches (la rivière, la forêt et ses oiseaux, l'usine) et le feu quand il approche ; quelques signaux ponctuent le récit (le téléphone qui vibre, l'alerte), et une cloche prévient quand le temps presse. Il se coupe d'un bouton.
- **Le lexique**, qui explique les mots de la prévention (batardeau, zone refuge, PCS…), schémas à l'appui.
- **Les vues rapprochées** des lieux, en fausse 3D, qui reflètent les gestes accomplis et la hauteur de l'eau.

Les autres risques sont cartographiés et décrits dans le DICRIM, mais pas encore jouables.

## Lancer le jeu

Il faut Node.js 22.12 ou plus récent (version paire ; développé avec la version 24).

```sh
npm install
npm run dev        # serveur de développement, sur http://localhost:5173
npm test           # tests unitaires
npm run typecheck  # vérification des types seule
npm run build      # vérification des types, puis site statique dans dist/
npm run preview    # sert le contenu de dist/ pour le vérifier
npm run liens      # vérifie que les pages officielles citées répondent toujours (celles qui refusent les lectures automatiques sont signalées : à relire à la main)
```

Le dossier `public/` contient l'image d'aperçu (`apercu.png`) que les réseaux sociaux affichent quand le lien du jeu est partagé ; elle sert aussi d'aperçu du dépôt.

Le dossier `dist/` se dépose tel quel sur n'importe quel hébergement statique. Les chemins sont relatifs : il fonctionne aussi dans un sous-dossier.

### Mise en ligne

Chaque poussée sur la branche `main` lance les tests, construit le site et le publie sur GitHub Pages (`.github/workflows/publier.yml`), à l'adresse `www.valdalea.fr` (domaine déclaré dans les réglages du dépôt). Si un test échoue, rien n'est publié. Le développement se fait sur une branche par jalon : seule la fusion dans `main` met en ligne.

En développement, `window.jcrm` donne accès au jeu depuis la console du navigateur.

## Contenus et sources

Toute consigne de sécurité affichée dans le jeu reprend une page officielle, relue à la source, et la cite. Les personnages, les dates, le déroulé de la crue et celui du feu sont de la fiction.

- `src/content/sources.json` : les pages officielles citées, avec la date de leur dernière relecture. Une page qui refuse les lectures automatiques porte la mention `manuel` : elle se relit à la main, dans un navigateur.
- `src/content/chapitres.ts` : la liste des chapitres, telle que le téléphone la présente, et l'accès au contenu de celui qui se joue.
- `src/content/badges.ts` : les badges de toute la partie, qui ne tiennent pas à un chapitre.
- `src/content/prologue.ts` : la rencontre du maire et la lecture du DICRIM.
- `src/content/inondation.ts` : le chapitre de l'inondation — gestes, questions, situations de crise, bilan, bulletins. Chaque élément porte l'identifiant de ses sources.
- `src/content/feu.ts` : le chapitre du feu de forêt — le printemps, l'été, les décisions, le bilan, les messages.
- `src/content/kit.ts` : le kit d'urgence 72 heures, commun à tous les risques. Il se prépare dans le premier chapitre joué, quel qu'il soit, avec ses questions ; dans les suivants, il se vérifie.
- `src/content/dicrim.ts` : le DICRIM. Ce qui décrit la commune est inventé ; les phénomènes et les bons réflexes reprennent les pages officielles.
- `src/content/lexique.ts` : les définitions du lexique.
- `src/content/places.ts` : textes de présentation des lieux (aucune consigne).
- `src/content/credits.ts` : l'auteur, le dépôt et les licences, tels que « À propos » les affiche.

Un chapitre est un contenu, pas du code : ses gestes, ses horaires, son récit d'ouverture, son indicateur de danger (`ChapterContent`, dans `src/content/model.ts`), et le script de sa crise (`CrisisScript`) : le récit et les messages qui l'annoncent, les situations à trancher, le niveau du danger montré sur la carte à chaque moment (la hauteur de la crue, ou l'avancée du feu), les enjeux et les badges du bilan. Les règles et l'interface sont les mêmes pour tous.

Sources : ministère de l'Intérieur (« Conseils face au risque de feu de forêt », Sécurité civile, et « Feu de forêt en France : comment s'informer, se protéger et agir ? », Ma Sécurité, pour l'évacuation ; FR-Alert), ministère de la Transition écologique (« Prévention des feux de forêt en France », pour la vitesse d'un front de flammes et les départs de feu en avant du front ; campagne « Ayons les bons réflexes » ; « Préparer son kit d'urgence 72 h »), Géorisques (fiches « Que faire en cas de… » pour l'inondation, le feu de forêt et l'accident industriel ; fiches risques, dont celle du feu de forêt pour la Météo des forêts ; kit d'urgence 72 h ; plan individuel de mise en sûreté ; DICRIM ; information préventive ; acteurs publics de la prévention ; vigilance ; fonds Barnier ; obligations de débroussaillement), Vigicrues (définition des quatre niveaux de vigilance, conseils de comportement par niveau), Météo-France (carte de vigilance météorologique), plateforme nationale des repères de crues. La liste complète, avec les adresses, est dans `src/content/sources.json`.

Le temps qu'il fait, l'état de la rivière et les moments de récit entre les phases sont de la fiction : ils ne portent aucune consigne. Le signal d'alerte que le jeu fait entendre est inventé : il ne reproduit pas le vrai signal de FR-Alert, pour ne pas pouvoir être pris pour lui hors du jeu.

Pour modifier une consigne : relire la page officielle, corriger le texte, mettre à jour la date `consulte` de la source. Les tests refusent une consigne sans source.

## Organisation du code

Aucune dépendance à l'exécution : TypeScript, l'API Canvas 2D, SVG, le DOM et l'API Web Audio. Vite et Vitest ne servent qu'au développement.

| Dossier | Rôle |
|---|---|
| `src/core` | Géométrie, état de la partie, sauvegarde (avec reprise des parties des versions précédentes), règles du jeu : prologue, choix des chapitres, phases, temps, bilan. Sans DOM, testable seul. |
| `src/world` | Plan de la commune (`valdalea.ts`), grille de franchissabilité, calcul d'itinéraire, relief et inondation, contour de la zone inondable, zones de risque, propagation du feu de forêt (`fire.ts`), élargissement de la commune (`widen.ts`). Sans DOM. |
| `src/content` | Textes et contenus de prévention, séparés du code pour être relus facilement. |
| `src/audio` | Son du jeu, synthétisé avec l'API Web Audio (ambiance, signaux, cloche) : aucun fichier sonore. Le mixage (`mix.ts`) est un calcul pur, testé ; `sound.ts` le fait entendre ; `lab.ts` mesure les niveaux, en développement seulement. |
| `src/render` | Dessin du plan, mis en cache par tuiles, cartes de risques, nappes d'eau, feu de forêt, temps qu'il fait (voile, pluie, fumée) et éléments animés. |
| `src/game` | Boucle de jeu, entrées (clavier, pointeur, manette tactile), caméra. |
| `src/ui` | Interface en HTML : barre, fenêtres, téléphone, fiches de lieux, carnet de mission, DICRIM (mise en pages et impression), légende, schémas, confirmation avant de quitter, déroulé du chapitre. |
| `src/ui/scenes` | Vues rapprochées des lieux, dessinées en SVG. |
| `tests` | Tests unitaires : règles du chapitre, cohérence des contenus, kit d'urgence, badges, validité du plan, élargissement de la commune, grille de franchissabilité, relief, zones de risque, contour de la zone inondable, propagation du feu, itinéraires, ambiance sonore, sauvegarde. |
| `scripts` | Outils du dépôt : vérification des liens officiels (`verifier-liens.mjs`). |
| `public` | Fichiers publiés tels quels : l'image d'aperçu. |

Le DICRIM est mis en pages dans le navigateur : ses blocs (titres, paragraphes, cartes, listes) sont répartis sur des pages de 794 × 1123 px, soit une feuille A4 à 96 points par pouce, en mesurant ce qui tient. Une carte est réduite si cela évite une page presque vide. L'impression reprend exactement ces pages ; c'est la fenêtre d'impression du navigateur qui propose l'enregistrement en PDF. Sur un écran étroit, les mêmes pages se lisent en continu, à la largeur de l'écran.

Unités : une unité « monde » vaut un mètre. La commune fait 4,5 km sur 3 ; les bâtiments sont grossis, comme sur un plan schématique. Le temps du jeu n'est jamais réel : il n'avance que lorsque le joueur accomplit un geste ou se déplace, à 6 km/h.

## Accessibilité

Le jeu vise les critères du RGAA :

- l'interface est en HTML sémantique, les fenêtres utilisent l'élément natif `<dialog>` ;
- tout se fait au clavier, et le focus reste visible ; sur un écran tactile, une manette de déplacement s'ajoute au toucher de la carte ;
- la carte et les illustrations ne sont pas indispensables : la liste des lieux, le carnet de mission et la liste des gestes en sont l'alternative, et chaque carte de risque est décrite en toutes lettres ;
- on ne quitte pas le jeu par mégarde : un « retour » du navigateur ouvre une confirmation du jeu ; fermer l'onglet, recharger la page ou partir vers un autre site déclenche celle du navigateur (sa fenêtre et son texte, qu'une page ne peut pas choisir) ;
- rien n'est chronométré, et le récit n'avance jamais seul : chaque étape attend le joueur ;
- la pluie et la lumière du soir sont un décor : le temps qu'il fait est aussi écrit dans la barre d'état ;
- aucune information ne repose sur la couleur seule (niveaux de vigilance, zones des cartes, états des gestes, résultats du bilan) ;
- les animations se désactivent, et suivent par défaut le réglage du système : la pluie reste alors visible, mais immobile ;
- le son est un décor : tout ce qu'il dit est aussi écrit à l'écran. Il ne démarre qu'après le premier geste du joueur, se choisit dès l'écran d'accueil et se coupe d'un bouton toujours visible.

Aucun audit de conformité n'a encore été réalisé.

## Feuille de route

1. **Socle** : carte, déplacement, lieux, téléphone, sauvegarde. *Fait.*
2. **Inondation, de bout en bout** : vues rapprochées, gestes de prévention, vigilance, crue, bilan, DICRIM complet, carnet de mission, récit et météo, premiers badges. *Fait.*
3. **Autres risques naturels et technologiques** : rendre jouables le feu de forêt, l'accident industriel, les argiles, les cavités et les chutes de blocs, déjà cartographiés ; tempête. *En cours : le prologue commun, la liste des chapitres, le choix libre des chapitres et le chapitre du feu de forêt sont faits.*
4. **Finition** : tutoriel, son, page de ressources officielles, plan individuel de mise en sûreté. *En cours : le son est fait (ambiance, signaux).*
5. **Extensions** : risques sanitaires et sociétaux, mode hors ligne.

## Licence

- Code : [MIT](LICENSE).
- Contenus (textes du jeu, documentation) : [CC BY-SA 4.0](LICENSE-CONTENUS.md).
