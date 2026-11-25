import { inflate, rect, rectToPolygon, vec } from '../core/geometry';
import { doorPoint, WorldBuilder } from './builder';
import type { Commune } from './model';

/**
 * Val-d'Aléa : commune fictive, dessinée pour réunir sur un petit territoire
 * les principales situations d'exposition aux risques majeurs.
 *
 *   ouest  : la falaise et le quartier de Sous-la-Roche à son pied
 *   nord   : le plateau argileux et son lotissement, le Haut-Bourg (mairie, gymnase)
 *   centre : le Vieux-Bourg, bâti sur d'anciennes carrières souterraines
 *   sud    : le Bas-Bourg le long de la Follette, le camping sur l'autre rive
 *   est    : la forêt et le hameau des Brandes, la cité et la zone industrielle des Vannes
 */
export function buildValDAlea(): Commune {
  const b = new WorldBuilder("Val-d'Aléa", 4200, 3000, 2026);

  // ---------------------------------------------------------------- Relief
  b.ground('eboulis', [vec(0, 0), vec(420, 0), vec(470, 300), vec(440, 700), vec(490, 1100), vec(460, 1470), vec(320, 1600), vec(0, 1600)]);
  b.ground('falaise', [vec(0, 0), vec(380, 0), vec(430, 300), vec(400, 700), vec(450, 1100), vec(420, 1450), vec(300, 1560), vec(0, 1560)]);

  const forest = [
    vec(2980, 0),
    vec(4200, 0),
    vec(4200, 1200),
    vec(3950, 1280),
    vec(3700, 1180),
    vec(3450, 1020),
    vec(3250, 820),
    vec(3080, 520),
    vec(2980, 250),
  ];
  b.ground('foret', forest);

  // ---------------------------------------------------------------- Champs
  b.groundRect('champ', rect(860, 120, 280, 620), 0);
  b.groundRect('champ', rect(860, 800, 290, 760), 1);
  b.groundRect('champ', rect(2170, 60, 760, 560), 2);
  b.groundRect('champ', rect(2950, 1420, 480, 180), 2);
  b.groundRect('champ', rect(60, 2420, 1300, 520), 0);
  b.groundRect('champ', rect(2180, 2440, 760, 500), 3);
  b.groundRect('champ', rect(3000, 2520, 1140, 420), 1);

  // --------------------------------------------------------------- Rivière
  b.river('la Follette', 130, [
    vec(-60, 2120),
    vec(400, 2160),
    vec(900, 2280),
    vec(1400, 2330),
    vec(1900, 2260),
    vec(2400, 2220),
    vec(2900, 2290),
    vec(3400, 2400),
    vec(3900, 2380),
    vec(4260, 2330),
  ]);
  b.bridge('pont', rect(2070, 2140, 60, 220));
  b.bridge('passerelle', rect(1630, 2200, 40, 200));

  // ---------------------------------------------------------------- Voirie
  b.road('departementale', [vec(-60, 1720), vec(600, 1690), vec(1100, 1660), vec(3400, 1660), vec(3900, 1640), vec(4260, 1600)], 'Grande-Rue');
  b.road('avenue', [vec(2100, -60), vec(2100, 3060)], 'avenue de la République');

  b.road('rue', [vec(640, -60), vec(640, 1690)], 'rue de la Roche');
  b.road('rue', [vec(1200, 300), vec(2100, 300)], 'rue des Argilières');
  b.road('rue', [vec(1200, 660), vec(2100, 660)], 'rue des Tuileries');
  b.road('rue', [vec(1200, 300), vec(1200, 1660)], 'rue du Plateau');
  b.road('rue', [vec(2100, 1000), vec(2960, 1000)], 'rue de la Mairie');
  b.road('ruelle', [vec(2960, 1000), vec(3150, 1060), vec(3350, 1220), vec(3650, 1330), vec(3720, 1500), vec(3720, 1650)], 'chemin des Brandes');

  b.road('rue', [vec(1200, 1150), vec(2100, 1150)], 'rue des Carriers');
  b.road('rue', [vec(1200, 1430), vec(2100, 1430)], 'rue Basse');
  b.road('rue', [vec(1650, 1150), vec(1650, 1660)], "rue de l'Église");
  b.road('ruelle', [vec(1420, 1150), vec(1420, 1430)], 'ruelle du Puits');
  b.road('ruelle', [vec(1880, 1150), vec(1880, 1430)], 'ruelle des Caves');

  b.road('rue', [vec(1300, 2100), vec(2900, 2100)], 'quai de la Follette');
  b.road('rue', [vec(1300, 1660), vec(1300, 2100)], 'rue du Lavoir');
  b.road('rue', [vec(1500, 1660), vec(1500, 2100)], "rue de l'École");
  b.road('rue', [vec(2620, 1660), vec(2620, 2100)], 'rue du Moulin');

  b.road('rue', [vec(3120, 1660), vec(3120, 2110)], "rue de l'Usine");
  b.road('rue', [vec(3400, 1660), vec(3400, 1790)]);

  b.road('chemin', [vec(2074, 2575), vec(1500, 2575), vec(1500, 2800), vec(2030, 2800), vec(2030, 2575)]);
  b.road('chemin', [vec(1650, 2120), vec(1650, 2575)]);

  // --------------------------------------------------------- Sous-la-Roche
  b.houseRow(rect(480, 330, 130, 1120), 'E');
  b.houseRow(rect(670, 420, 130, 800), 'W');

  // ------------------------------------------- Le plateau : Les Argilières
  b.houseRow(rect(1240, 140, 820, 130), 'S');
  b.houseRow(rect(1240, 330, 820, 140), 'N');
  b.houseRow(rect(1240, 490, 820, 140), 'S');
  b.houseRow(rect(1240, 690, 820, 140), 'N');

  // ------------------------------------------------------------ Haut-Bourg
  b.groundRect('parc', rect(2230, 680, 340, 80));
  const mairie = b.building('mairie', rect(2290, 770, 220, 120), { id: 'mairie', roof: 'ardoise', tone: 1, door: 'S' });
  b.groundRect('place', rect(2230, 890, 340, 88));
  const gymnase = b.building('gymnase', rect(2640, 740, 230, 150), { id: 'gymnase', roof: 'bac', tone: 0, door: 'S' });
  b.groundRect('parking', rect(2640, 892, 230, 86));
  b.houseRow(rect(2160, 1025, 760, 145), 'N');
  b.groundRect('parc', rect(2160, 1220, 400, 300));
  b.townRow(rect(2140, 1550, 420, 72), 'S', 'commerce');
  b.houseRow(rect(2600, 1470, 330, 150), 'S');

  // ----------------------------------------------------------- Vieux-Bourg
  b.townRow(rect(1240, 1050, 820, 75), 'S');
  for (const [x0, length] of [
    [1230, 170],
    [1440, 185],
    [1900, 165],
  ] as const) {
    b.groundRect('cour', rect(x0, 1245, length, 90));
    b.townRow(rect(x0, 1175, length, 70), 'N');
    b.townRow(rect(x0, 1335, length, 70), 'S');
  }
  b.groundRect('place', rect(1675, 1175, 185, 230));
  const eglise = b.building('eglise', rect(1700, 1230, 140, 100), { id: 'eglise', roof: 'ardoise', tone: 2, door: 'W' });
  for (const [x0, length] of [
    [1230, 395],
    [1675, 390],
  ] as const) {
    b.groundRect('cour', rect(x0, 1525, length, 25));
    b.townRow(rect(x0, 1455, length, 70), 'N');
    b.townRow(rect(x0, 1550, length, 72), 'S');
  }

  // ------------------------------------------------------------- Bas-Bourg
  b.houseRow(rect(1330, 1700, 140, 150), 'N');
  b.houseRow(rect(1330, 1920, 140, 150), 'S');
  b.townRow(rect(1530, 1700, 530, 75), 'N', 'commerce');
  b.groundRect('cour', rect(1540, 1810, 280, 130));
  const ecole = b.building('ecole', rect(1560, 1955, 240, 105), { id: 'ecole', roof: 'tuile', tone: 2, door: 'S' });
  b.houseRow(rect(1850, 1920, 210, 150), 'S');
  b.townRow(rect(2140, 1700, 450, 75), 'N', 'commerce');
  b.groundRect('jardin', rect(2143, 1923, 164, 144));
  const home = b.building('pavillon', rect(2180, 1960, 100, 80), { id: 'domicile', roof: 'tuile', tone: 0, door: 'S' });
  b.houseRow(rect(2320, 1920, 270, 150), 'S', { lot: 130 });
  b.houseRow(rect(2650, 1700, 290, 150), 'N', { lot: 140 });
  b.houseRow(rect(2650, 1920, 290, 150), 'S', { lot: 140 });

  // ------------------------------------------------------- Cité des Vannes
  b.houseRow(rect(2990, 1720, 110, 360), 'E', { lot: 120, uniform: true });
  b.houseRow(rect(3140, 1720, 110, 360), 'W', { lot: 120, uniform: true });

  // --------------------------------------- Zone industrielle : site Seveso
  const site = rect(3330, 1810, 760, 400);
  b.groundRect('industrie', site);
  b.fence(site, { side: 'N', from: 3376, to: 3424 });
  b.groundRect('parking', rect(3450, 1712, 220, 76));
  b.building('local', rect(3440, 1830, 60, 40), { roof: 'plat', tone: 0 });
  b.building('hangar', rect(3540, 1850, 220, 130), { roof: 'bac', tone: 1 });
  b.building('hangar', rect(3800, 1840, 240, 110), { roof: 'bac', tone: 2 });
  b.building('hangar', rect(3380, 1960, 120, 200), { roof: 'bac', tone: 3 });
  b.building('hangar', rect(3540, 2030, 200, 140), { roof: 'bac', tone: 1 });
  for (const [x, y] of [
    [3830, 2030],
    [3930, 2030],
    [4030, 2030],
    [3830, 2140],
    [3930, 2140],
  ] as const) {
    b.tank(x, y, 38);
  }

  // ---------------------------------------------------- Hameau des Brandes
  for (const [x, y, w, h, door] of [
    [3230, 930, 90, 70, 'S'],
    [3440, 1090, 100, 70, 'S'],
    [3620, 1190, 90, 70, 'S'],
    [3820, 1330, 100, 80, 'W'],
    [3480, 1370, 100, 70, 'N'],
    [3260, 1290, 90, 70, 'N'],
    [3780, 1520, 90, 70, 'W'],
  ] as const) {
    const house = rect(x, y, w, h);
    b.groundRect('jardin', inflate(house, 25));
    b.building('pavillon', house, { roof: 'tuile', door });
  }

  // --------------------------------------------------------------- Camping
  const camping = rect(1450, 2470, 620, 380);
  b.groundRect('camping', camping);
  const accueil = b.building('local', rect(1960, 2490, 80, 50), { id: 'camping-accueil', roof: 'tuile', tone: 3, door: 'S' });
  b.building('local', rect(1740, 2650, 80, 50), { roof: 'plat', tone: 1 });
  for (const x of [1480, 1560, 1700, 1780, 1860]) {
    b.building('mobil-home', rect(x, 2500, 50, 30), { roof: 'plat', tone: 2 });
  }
  for (let y = 2620; y <= 2740; y += 100) {
    for (let x = 1550; x <= 1980; x += 86) {
      if (x > 1700 && x < 1860 && y < 2700) continue; // emplacement du bloc sanitaire
      b.decor((x + y) % 3 === 0 ? 'caravane' : 'tente', x, y);
    }
  }

  // ---------------------------------------------------------------- Arbres
  b.scatterTrees(forest, 58, 15, 24);
  b.scatterTrees(rectToPolygon(rect(2160, 1220, 400, 300)), 78, 14, 20);
  b.scatterTrees(rectToPolygon(rect(2230, 680, 340, 80)), 64, 13, 17);
  b.riverTrees(92);
  for (const [x, y] of [
    [2248, 906],
    [2248, 960],
    [2552, 906],
    [2552, 960],
    [1692, 1388],
    [1842, 1388],
    [1842, 1196],
  ] as const) {
    b.tree(x, y, 13);
  }

  // ------------------------------------------------------------ Toponymie
  b.label('secteur', 'Sous-la-Roche', 800, 1420);
  b.label('secteur', 'Les Argilières', 1650, 104);
  b.label('secteur', 'Haut-Bourg', 2760, 668);
  b.label('secteur', 'Vieux-Bourg', 1650, 950);
  b.label('secteur', 'Bas-Bourg', 2365, 1852);
  b.label('secteur', 'Les Brandes', 3540, 1560);
  b.label('secteur', 'Forêt des Brandes', 3700, 480);
  b.label('lieu-dit', 'Cité des Vannes', 3120, 2160);
  b.label('lieu-dit', 'Z.I. des Vannes', 3710, 2252);
  b.label('lieu-dit', 'La Falaise', 205, 780);
  b.label('batiment', 'Mairie', 2400, 760);
  b.label('batiment', 'Gymnase', 2755, 730);
  b.label('batiment', 'Église', 1770, 1220);
  b.label('batiment', 'École', 1680, 1876);
  b.label('batiment', 'Engrais du Val', 3650, 2006);
  b.label('batiment', 'Camping des Berges', 1765, 2832);

  // -------------------------------------------------------------- Secteurs
  b.sector('sous-la-roche', 'Sous-la-Roche', rect(460, 200, 420, 1420));
  b.sector('argilieres', 'Les Argilières', rect(1220, 120, 860, 730));
  b.sector('vieux-bourg', 'Vieux-Bourg', rect(1220, 1030, 860, 600));
  b.sector('haut-bourg', 'Haut-Bourg', rect(2130, 660, 830, 970));
  b.sector('bas-bourg', 'Bas-Bourg', rect(1280, 1692, 1680, 450));
  b.sector('cite', 'Cité des Vannes', rect(2960, 1700, 320, 420));
  b.sector('zone-industrielle', 'Zone industrielle des Vannes', rect(3300, 1692, 820, 540));
  b.sector('brandes', 'Hameau des Brandes', rect(3160, 880, 800, 760));
  b.sector('foret', 'Forêt des Brandes', rect(2980, 0, 1220, 880));
  b.sector('camping', 'Camping des Berges', camping);

  // ----------------------------------------------------------------- Lieux
  b.place('domicile', 'Chez vous', 'domicile', 'bas-bourg', doorPoint(home));
  b.place('mairie', 'Mairie', 'mairie', 'haut-bourg', doorPoint(mairie));
  b.place('gymnase', 'Gymnase des Hauts', 'gymnase', 'haut-bourg', doorPoint(gymnase));
  b.place('ecole', 'École du Quai', 'ecole', 'bas-bourg', doorPoint(ecole));
  b.place('pont', 'Pont de la Follette', 'pont', 'bas-bourg', vec(2100, 2130));
  b.place('vieux-bourg', "Place de l'Église", 'quartier', 'vieux-bourg', doorPoint(eglise));
  b.place('argilieres', 'Lotissement des Argilières', 'quartier', 'argilieres', vec(1650, 300));
  b.place('sous-la-roche', 'Sous-la-Roche', 'quartier', 'sous-la-roche', vec(640, 820));
  b.place('brandes', 'Hameau des Brandes', 'quartier', 'brandes', vec(3500, 1275));
  b.place('cite', 'Cité des Vannes', 'quartier', 'cite', vec(3120, 1900));
  b.place('usine', 'Usine Engrais du Val', 'usine', 'zone-industrielle', vec(3400, 1772));
  b.place('camping', 'Camping des Berges', 'camping', 'camping', doorPoint(accueil));

  b.spawn(doorPoint(home));
  return b.commune;
}
