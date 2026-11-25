import type { RiskId } from '../world/model';

/**
 * Le DICRIM de Val-d'Aléa.
 *
 * C'est un document fictif, bâti comme un vrai : mot des élus, un chapitre par
 * risque avec sa carte, les moyens d'alerte et une page mémo. Ce qui décrit la
 * commune (`local`, `commune`) est inventé. Ce qui décrit les phénomènes et les
 * bons réflexes (`phenomenon`, `reflexes`) reprend les pages officielles citées.
 */

export interface DicrimRisk {
  id: RiskId;
  title: string;
  /** Le phénomène, d'après les sources officielles. */
  phenomenon: string[];
  /** La situation à Val-d'Aléa. */
  local: string[];
  /** Ce que montre la carte, pour qui ne la voit pas. */
  mapSummary: string;
  /** Ce que fait la commune. */
  commune: string[];
  /** Consignes officielles, regroupées par moment. */
  reflexes: Array<{ heading: string; items: string[] }>;
  sources: string[];
}

export const DICRIM = {
  title: "Document d'information communal sur les risques majeurs",
  edition: 'Édition 2026',
  word: {
    title: 'Le mot des élus',
    signature: "Le conseil municipal de Val-d'Aléa",
    paragraphs: [
      "Val-d'Aléa a grandi entre une rivière, une falaise et une forêt. Cette géographie fait son charme ; elle fait aussi ses risques.",
      "Aucun n'est une fatalité, à condition de les connaître. Ce document vous dit où ils se trouvent, ce que la commune fait pour s'y préparer et ce que chacun peut faire chez soi.",
      'Lisez-le, conservez-le, parlez-en autour de vous.',
    ],
  },
  about: {
    paragraphs: [
      "Toute personne a un droit à l'information sur les risques majeurs auxquels elle est soumise et sur les mesures de sauvegarde qui la concernent. Dans chaque commune exposée, le maire réunit cette information dans un document : le DICRIM.",
      "Il présente les risques de la commune, leurs conséquences prévisibles, les mesures de prévention, de protection et de sauvegarde, et les consignes de sécurité à appliquer. Il est mis à jour au moins tous les cinq ans.",
    ],
    sources: ['georisques-dicrim', 'georisques-information-preventive'],
  },
  risks: [
    {
      id: 'inondation',
      title: 'Inondation',
      phenomenon: [
        "Une inondation est la submersion temporaire de zones habituellement hors d'eau. Elle peut venir du débordement d'un cours d'eau, du ruissellement, d'une remontée de nappe ou, sur le littoral, d'une submersion marine.",
        "Certaines crues, dites « éclair », se caractérisent par une montée extrêmement rapide des eaux : le niveau peut monter de plusieurs mètres en moins de deux heures.",
      ],
      local: [
        "La Follette traverse la commune d'ouest en est. Après de fortes pluies d'automne, elle peut sortir de son lit en quelques heures.",
        "Les crues de 1958 et de 1994 ont inondé tout le Bas-Bourg. Un repère de crue, sur le pont, garde la mémoire de celle de 1958, la plus haute connue : c'est elle qui délimite la zone inondable.",
      ],
      mapSummary:
        "La zone inondable suit la Follette. Elle couvre le quai, les maisons qui le bordent, l'école du Quai et, sur la rive sud, le camping des Berges. La mairie, le gymnase, le Vieux-Bourg et la zone industrielle sont hors d'eau.",
      commune: [
        'Elle suit les bulletins de Vigicrues et de Météo-France.',
        "Son plan communal de sauvegarde prévoit la fermeture du pont et de la passerelle, l'évacuation du camping et l'ouverture d'un centre d'hébergement au gymnase des Hauts.",
        'Elle entretient le repère de crue du pont.',
      ],
      reflexes: [
        {
          heading: 'Avant',
          items: [
            "Se renseigner auprès de sa mairie sur le type d'inondation possible et sur les mesures de protection prévues.",
            'Faire réaliser un diagnostic de vulnérabilité de sa maison.',
            "Préparer son kit d'urgence 72 heures.",
            'Prévoir les dispositifs de protection à installer : sacs de sable, barrières amovibles (batardeaux), matériel pour surélever les meubles.',
            "Aménager une zone refuge à l'étage, avec une ouverture permettant l'évacuation, ou identifier un lieu proche où se réfugier.",
          ],
        },
        {
          heading: "Quand l'inondation est annoncée et que l'eau monte",
          items: [
            "S'éloigner des cours d'eau, des berges et des ponts.",
            'Reporter tous ses déplacements, à pied comme en voiture.',
            "Ne pas aller chercher ses enfants à la crèche ou à l'école : ils y sont en sécurité.",
            "S'informer sur les sites de Météo-France et de Vigicrues.",
            'Installer les dispositifs de protection sans se mettre en danger, et placer en hauteur les produits polluants.',
            "Couper, si possible, les réseaux de gaz, d'électricité et de chauffage.",
            "Se réfugier dans un bâtiment, en hauteur ou à l'étage, avec son kit d'urgence.",
            'Ne pas descendre dans les sous-sols ni dans les parkings souterrains.',
          ],
        },
        {
          heading: "Pendant toute la durée de l'inondation",
          items: [
            "Ne pas prendre sa voiture : 30 cm d'eau suffisent à l'emporter.",
            'Éviter de téléphoner, afin de laisser les réseaux disponibles pour les secours.',
            "Rester à l'abri et n'évacuer son domicile que sur ordre des autorités.",
            "Rester à l'écoute des consignes des autorités.",
          ],
        },
      ],
      sources: ['georisques-risque-inondation', 'georisques-inondation'],
    },
    {
      id: 'mouvement-terrain',
      title: 'Chutes de blocs',
      phenomenon: [
        'Les mouvements de terrain sont des déplacements naturels de sols et de sous-sols. Certains sont lents ; d’autres, soudains et brutaux, peuvent mettre en danger les personnes.',
        "Les éboulements et chutes de blocs rocheux sont des mouvements rapides, causés par la fracturation du massif, l'érosion, une forte pluviométrie ou la végétation.",
      ],
      local: [
        "La falaise qui borde la commune à l'ouest domine le quartier de Sous-la-Roche. Des blocs s'en détachent régulièrement ; la plupart s'arrêtent dans les éboulis, au pied de la paroi.",
        'En 1987, un bloc de plusieurs tonnes a traversé un jardin de la rue de la Roche.',
      ],
      mapSummary: "L'aléa est fort au pied de la falaise, du côté ouest de la rue de la Roche. Il est moyen de l'autre côté de la rue.",
      commune: [
        'Elle fait inspecter la falaise chaque année.',
        'Elle a fait poser des filets de protection au-dessus des maisons les plus proches de la paroi.',
        'Elle limite les constructions nouvelles au pied de la falaise.',
      ],
      reflexes: [
        {
          heading: 'Se préparer',
          items: ['Se renseigner en mairie sur les zones exposées.', "Préparer son kit d'urgence 72 heures et son plan individuel de mise en sûreté."],
        },
      ],
      sources: ['georisques-mouvement-terrain', 'georisques-pims'],
    },
    {
      id: 'cavites',
      title: 'Cavités souterraines',
      phenomenon: [
        "Les cavités souterraines sont des vides situés sous la terre. Certaines sont naturelles ; d'autres, comme les galeries d'anciennes mines ou carrières, représentent un risque en l'absence d'entretien.",
        "L'effondrement d'une cavité n'est pas prévisible.",
      ],
      local: [
        "Le Vieux-Bourg a été bâti avec la pierre extraite juste en dessous de lui. Les carrières, abandonnées depuis plus d'un siècle, s'étendent sous une partie du quartier ; leur plan est incomplet.",
        'Plusieurs puits et entrées ont été murés. Des affaissements de chaussée ont été constatés rue Basse.',
      ],
      mapSummary:
        "L'emprise connue des anciennes carrières couvre le cœur du Vieux-Bourg, autour de la place de l'Église, de la rue des Carriers à la Grande-Rue. Trois puits, entrées ou galeries y sont repérés.",
      commune: [
        'Elle tient à jour la carte des cavités connues.',
        'Elle fait surveiller les galeries accessibles.',
        'Elle recueille les signalements des habitants et les transmet sans délai au préfet.',
      ],
      reflexes: [
        {
          heading: 'Ce qui est demandé à chacun',
          items: [
            "Informer la mairie de l'existence d'une cavité souterraine sous un terrain, ou même d'un simple indice : c'est une obligation.",
            'Ne jamais se rendre dans une cavité souterraine sans être habilité et équipé pour le faire.',
          ],
        },
      ],
      sources: ['georisques-mouvement-terrain', 'georisques-information-preventive'],
    },
    {
      id: 'argiles',
      title: 'Retrait-gonflement des argiles',
      phenomenon: [
        'Un sol argileux se comporte comme une éponge : il se rétracte en période sèche et gonfle en période humide.',
        'Ces variations de volume créent des mouvements de terrain sous les constructions. Fissures, tassements : dans les cas les plus graves, la maison peut devenir inhabitable.',
      ],
      local: [
        "Le plateau, au nord de la commune, repose sur une épaisse couche d'argile, autrefois exploitée par des tuileries. Le lotissement des Argilières y a été construit dans les années 1980.",
        'Après les étés secs de ces dernières années, plusieurs maisons du lotissement présentent des fissures.',
      ],
      mapSummary: "L'exposition est forte sur le nord et l'ouest du lotissement des Argilières, là où la couche d'argile est la plus épaisse : dans une même rue, des maisons voisines ne sont pas exposées de la même façon. Elle est moyenne sur le reste du lotissement, du plateau et de ses abords, jusqu'au nord du Haut-Bourg.",
      commune: ['Elle informe les acquéreurs et les constructeurs du zonage.', 'Elle signale à la préfecture les dégâts constatés après chaque sécheresse.'],
      reflexes: [
        {
          heading: 'Pour une maison existante',
          items: [
            'Surveiller les fissures qui apparaissent dans le logement, grâce à la pose de jauges.',
            'Prendre des mesures de prévention : gestion des eaux, gestion de la végétation, imperméabilisation du sol au droit des fondations.',
          ],
        },
        {
          heading: "En cas de dégât qui menace la stabilité d'un bâtiment",
          items: ['Prévenir la mairie.', "Ne pas s'approcher des bâtiments endommagés.", 'Évacuer le bâtiment si les secours ou les experts le demandent.'],
        },
      ],
      sources: ['georisques-argiles'],
    },
    {
      id: 'feu-foret',
      title: 'Feu de forêt',
      phenomenon: [
        "En France, neuf feux sur dix sont d'origine humaine : un mégot mal éteint ou un barbecue mal géré peuvent suffire à dévaster des hectares de végétation.",
        'Le débroussaillement est la meilleure des protections : 90 % des maisons détruites lors des feux de forêt se situent sur des terrains pas ou mal débroussaillés.',
      ],
      local: [
        "La forêt des Brandes couvre le nord-est de la commune. Le hameau des Brandes s'est construit à sa lisière ; un seul chemin le relie au bourg.",
        "Le massif est classé à risque d'incendie. Toutes les constructions situées à l'intérieur ou à moins de 200 mètres du massif sont soumises aux obligations légales de débroussaillement : au moins 50 mètres autour de chaque habitation, à la charge du propriétaire.",
      ],
      mapSummary:
        'Le massif forestier occupe le nord-est de la commune. La bande de 200 mètres où le débroussaillement est obligatoire englobe quatre maisons du hameau des Brandes ; les trois autres, plus au sud, sont en dehors.',
      commune: ['Chaque printemps, elle rappelle leurs obligations aux propriétaires concernés.', "Elle entretient le chemin des Brandes, seul accès des pompiers au hameau."],
      reflexes: [
        {
          heading: 'Pour éviter les départs de feu',
          items: [
            "Débroussailler autour de chez soi avant l'été.",
            'Organiser les barbecues loin de la végétation.',
            "Réaliser les travaux de bricolage, sources d'étincelles, loin de la pelouse et des herbes sèches.",
            'Jeter ses mégots dans un cendrier et faire attention aux cendres incandescentes.',
          ],
        },
        {
          heading: 'En cas de départ de feu',
          items: [
            "Donner l'alerte en appelant le 112, le 18 ou le 114 (personnes malentendantes).",
            'Éloigner les combustibles (bouteilles de gaz, etc.).',
            "Rentrer le mobilier de jardin et le tuyau d'arrosage.",
            "Quitter le massif forestier immédiatement, ou s'abriter dans un bâtiment en dur.",
            'Fermer et arroser volets, portes et fenêtres ; occulter les aérations.',
            'Se couvrir le nez et la bouche avec un linge humide.',
            "Laisser son portail ouvert pour faciliter l'accès des pompiers.",
            'Dans son véhicule : ne pas en sortir et aller se garer dans une zone dégagée.',
          ],
        },
        {
          heading: 'En attendant les secours',
          items: [
            "Rester à l'écoute des consignes des autorités.",
            'Éviter de téléphoner pour laisser les réseaux disponibles pour les secours.',
            "Rester à l'abri et n'évacuer son domicile que sur ordre des autorités.",
            'Ne pas prendre sa voiture.',
          ],
        },
        {
          heading: "Si l'évacuation est ordonnée",
          items: [
            'Suivre les consignes de la préfecture, de la mairie, des secours et de FR-Alert : point de rassemblement, itinéraire, centre d’accueil.',
            'Ne jamais regagner son domicile avant une autorisation officielle.',
          ],
        },
      ],
      sources: ['georisques-feu', 'securite-civile-feu', 'interieur-feu-foret', 'georisques-old'],
    },
    {
      id: 'industriel',
      title: 'Risque industriel',
      phenomenon: [
        "Un accident industriel peut exposer la population et l'environnement à des effets thermiques, toxiques ou de surpression.",
        'Sont classés Seveso les établissements qui stockent, utilisent ou produisent des substances dangereuses au-delà de certaines quantités. Il existe des sites « seuil haut » et des sites « seuil bas ».',
      ],
      local: [
        "L'usine Engrais du Val, dans la zone industrielle des Vannes, fabrique et stocke des engrais. Elle est classée Seveso seuil haut.",
        "Le périmètre de son plan particulier d'intervention (PPI), arrêté par le préfet, couvre la zone industrielle, la cité des Vannes et le sud du hameau des Brandes.",
      ],
      mapSummary:
        "Le site de l'usine se trouve à l'est de la commune, au bord de la Follette. Le périmètre du plan particulier d'intervention forme un cercle autour de lui : il englobe la zone industrielle, la cité des Vannes et le sud du hameau des Brandes.",
      commune: ["Elle tient à disposition les brochures d'information éditées par l'industriel et la préfecture.", 'Elle participe aux exercices organisés par la préfecture.'],
      reflexes: [
        {
          heading: 'Se préparer',
          items: [
            "Demander à la mairie les brochures d'information éditées par l'industriel en lien avec la préfecture.",
            "Savoir reconnaître le signal national d'alerte : une sirène qui retentit trois fois pendant 1 minute et 41 secondes. La fin de l'alerte est donnée par un autre signal, de 30 secondes.",
            "Préparer son kit d'urgence 72 heures et se munir de gros ruban adhésif.",
          ],
        },
        {
          heading: "Dès le signal d'alerte",
          items: [
            "Se mettre à l'abri dans un bâtiment en dur, fermer portes et fenêtres.",
            'Calfeutrer les ouvertures et les aérations, arrêter la ventilation et la climatisation.',
            'Dans un véhicule : en sortir et gagner un bâtiment le plus rapidement possible.',
            'Ne pas aller chercher ses enfants : ils sont pris en charge par les équipes pédagogiques ou les secours.',
            "S'éloigner des fenêtres, pour se protéger d'éventuels éclats de verre.",
            'En cas de gêne respiratoire, respirer à travers un linge humide.',
          ],
        },
        {
          heading: "Jusqu'à la fin de l'alerte",
          items: [
            "Rester à l'écoute des consignes des autorités.",
            'Éviter de téléphoner, afin de laisser les réseaux disponibles pour les secours.',
            "Rester à l'abri et n'évacuer son domicile que sur ordre des autorités.",
            'Ne pas fumer, éviter toute flamme ou étincelle.',
          ],
        },
      ],
      sources: ['georisques-industriel', 'georisques-risque-industriel'],
    },
  ] satisfies DicrimRisk[],
  alert: {
    paragraphs: [
      "FR-Alert prévient en temps réel toute personne qui se trouve dans une zone de danger, par une notification sur son téléphone portable, accompagnée d'un signal sonore même si le téléphone est en mode silencieux. Aucune inscription ni application n'est nécessaire.",
      "D'autres canaux complètent ce dispositif : SMS de la mairie, sirènes, radios locales, applications Météo-France et Vigicrues.",
      "Le signal national d'alerte est une sirène qui retentit trois fois pendant 1 minute et 41 secondes. La fin de l'alerte est donnée par un autre signal, de 30 secondes.",
    ],
    shelter:
      "En cas d'évacuation, la commune ouvre un centre d'hébergement au gymnase des Hauts, à côté de la mairie. Il se trouve hors de toutes les zones de risque de la commune.",
    sources: ['fr-alert', 'ecologie-reflexes', 'georisques-industriel'],
  },
  memo: {
    emergency: "Pour donner l'alerte : le 112 ou le 18. Pour les personnes malentendantes : le 114.",
    kit: [
      'une radio à piles, avec des piles de rechange',
      'une lampe de poche, des bougies, un briquet ou des allumettes',
      "de l'eau potable : 6 litres par personne, en bouteilles",
      'de la nourriture non périssable, qui ne demande pas de cuisson',
      'des médicaments et une trousse de premiers secours',
      'des vêtements chauds et une couverture de survie',
      'des outils de base : couteau multifonctions, ouvre-boîte',
      'un chargeur de téléphone portable',
      'ses lunettes de vue de secours',
      "de l'argent liquide",
      'les photocopies des documents essentiels, dans une pochette étanche',
      'le double des clés de la maison et de la voiture',
      'des jeux pour occuper le temps',
    ],
    kitNote: "Rangez le sac dans un endroit facile d'accès, hors de portée de l'eau, et vérifiez son contenu une fois par an.",
    links: ['vigicrues', 'meteofrance-vigilance', 'georisques', 'georisques-pims'],
    sources: ['georisques-kit', 'ecologie-kit', 'georisques-feu'],
  },
};

/** Toutes les sources citées par le DICRIM, pour les tests de cohérence. */
export function dicrimSources(): string[] {
  return [...DICRIM.about.sources, ...DICRIM.risks.flatMap((risk) => risk.sources), ...DICRIM.alert.sources, ...DICRIM.memo.sources, ...DICRIM.memo.links];
}
