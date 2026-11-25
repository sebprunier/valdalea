import { h } from './dom';

/**
 * Schémas pédagogiques, dessinés en SVG : ce qu'est un batardeau, une zone
 * refuge, un repère de crue. Chacun a une description pour les lecteurs d'écran.
 */

const NS = 'http://www.w3.org/2000/svg';
const INK = '#1b2733';
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

function svg(viewBox: string, label: string, content: string): SVGSVGElement {
  const element = document.createElementNS(NS, 'svg');
  element.setAttribute('viewBox', viewBox);
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  element.classList.add('figure__image');
  // Contenu produit ici même, à partir de textes fixes.
  element.innerHTML = content;
  return element;
}

const text = (x: number, y: number, content: string, anchor = 'start', size = 13, weight = 600, fill = INK): string =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${content}</text>`;

const leader = (x1: number, y1: number, x2: number, y2: number): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="1.5"/><circle cx="${x2}" cy="${y2}" r="3" fill="${INK}"/>`;

function wrap(image: SVGSVGElement, caption: string): HTMLElement {
  return h('figure', { class: 'figure' }, image as unknown as Node, h('figcaption', null, caption));
}

/** Une porte protégée par un batardeau, l'eau d'un côté. */
function batardeau(): HTMLElement {
  const content = `
    <rect x="0" y="0" width="440" height="250" fill="#eef4f7"/>
    <rect x="20" y="20" width="340" height="196" fill="#f1e7d3" stroke="#6f6558" stroke-width="2"/>
    <rect x="140" y="62" width="100" height="154" fill="#7a5a3c" stroke="#4d3823" stroke-width="2"/>
    <rect x="152" y="76" width="76" height="52" fill="none" stroke="#4d3823" stroke-width="2"/>
    <circle cx="228" cy="146" r="4" fill="#d8c08a"/>
    <rect x="130" y="128" width="10" height="88" fill="#59646f"/>
    <rect x="240" y="128" width="10" height="88" fill="#59646f"/>
    <rect x="140" y="134" width="100" height="78" fill="#b3c0cb" stroke="#4c5763" stroke-width="2"/>
    <path d="M140 153h100M140 172h100M140 191h100" stroke="#7f8b95" stroke-width="2"/>
    <rect x="140" y="208" width="100" height="8" fill="#2f363d"/>
    <rect x="0" y="216" width="440" height="34" fill="#b9b19f"/>
    <rect x="0" y="164" width="440" height="52" fill="#5c8096" opacity="0.62"/>
    <path d="M0 164q12-7 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
    ${leader(108, 112, 134, 140)}${text(104, 106, 'Glissières', 'end')}${text(104, 121, 'fixées au mur', 'end', 12, 400)}
    ${leader(276, 112, 226, 150)}${text(280, 106, 'Panneau étanche')}${text(280, 121, 'amovible', 'start', 12, 400)}
    ${leader(276, 200, 236, 211)}${text(280, 196, 'Joint')}
    ${text(40, 186, 'eau', 'start', 13, 700, '#ffffff')}`;
  return wrap(
    svg('0 0 440 250', "Schéma d'un batardeau : un panneau étanche glissé dans deux glissières fixées de part et d'autre d'une porte. L'eau monte contre le panneau, sans passer la porte.", content),
    "Un batardeau en place : le panneau se glisse dans des glissières fixées à demeure, et un joint l'appuie contre le seuil.",
  );
}

/** Coupe d'une maison : l'eau au rez-de-chaussée, les habitants à l'étage. */
function zoneRefuge(): HTMLElement {
  const content = `
    <rect x="0" y="0" width="440" height="260" fill="#eef4f7"/>
    <polygon points="70,112 190,34 310,112" fill="#d98561" stroke="#8f4c33" stroke-width="2"/>
    <rect x="86" y="112" width="208" height="118" fill="#f6efe0" stroke="#6f6558" stroke-width="2"/>
    <line x1="86" y1="170" x2="294" y2="170" stroke="#6f6558" stroke-width="4"/>
    <rect x="0" y="230" width="440" height="30" fill="#b9b19f"/>
    <rect x="0" y="196" width="440" height="34" fill="#5c8096" opacity="0.62"/>
    <rect x="88" y="196" width="204" height="34" fill="#5c8096" opacity="0.5"/>
    <path d="M0 196q12-7 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
    <polygon points="218,56 252,78 240,84 206,62" fill="#bfe0f0" stroke="#4c5763" stroke-width="2"/>
    <circle cx="150" cy="130" r="9" fill="#e0b48f" stroke="#9a7450"/>
    <rect x="141" y="140" width="18" height="28" rx="5" fill="#35506b"/>
    <circle cx="182" cy="138" r="7" fill="#e0b48f" stroke="#9a7450"/>
    <rect x="175" y="146" width="14" height="22" rx="4" fill="#7c5c8e"/>
    <rect x="206" y="150" width="22" height="18" rx="4" fill="#e2702a" stroke="#8a3209" stroke-width="1.5"/>
    <path d="M211 150q6-9 12 0" fill="none" stroke="#8a3209" stroke-width="2"/>
    ${leader(318, 52, 240, 70)}${text(322, 40, 'Ouverture pour')}${text(322, 55, "l'évacuation")}
    ${leader(318, 150, 230, 158)}${text(322, 146, "Kit d'urgence")}
    ${text(100, 128, 'Zone refuge', 'start', 12, 700)}
    ${text(100, 218, 'rez-de-chaussée inondé', 'start', 12, 700, '#ffffff')}`;
  return wrap(
    svg('0 0 440 260', "Coupe d'une maison pendant une inondation. Le rez-de-chaussée est sous l'eau. Les habitants sont à l'étage, dans la zone refuge, avec leur kit d'urgence. Une fenêtre de toit permet leur évacuation.", content),
    "La zone refuge : une pièce à l'étage, avec une ouverture par laquelle les secours peuvent évacuer les occupants.",
  );
}

/**
 * Le repère de crue du pont, vu de près.
 * @param height hauteur du trait au-dessus du quai, en mètres
 */
export function floodMarkFigure(height: number): HTMLElement {
  const ground = 236;
  const scale = 86; // pixels par mètre
  const line = ground - height * scale;
  const person = ground - 1.7 * scale;
  const label = `${height.toFixed(2).replace('.', ',')} m`;
  const blocks = [0, 1, 2, 3, 4, 5]
    .map((row) => {
      const y = 12 + row * 40;
      const offset = row % 2 ? 40 : 0;
      return `<path d="M0 ${y}h420" stroke="#b3a892" stroke-width="2"/>` + [0, 1, 2, 3, 4, 5].map((col) => `<path d="M${col * 80 + offset} ${y}v40" stroke="#b3a892" stroke-width="2"/>`).join('');
    })
    .join('');
  const content = `
    <rect x="0" y="0" width="420" height="260" fill="#d9cfbb"/>
    ${blocks}
    <rect x="0" y="${ground}" width="420" height="24" fill="#a59c8a"/>
    <line x1="0" y1="${line}" x2="420" y2="${line}" stroke="#b93d0a" stroke-width="2" stroke-dasharray="8 6"/>
    <rect x="150" y="${line - 62}" width="176" height="74" rx="4" fill="#1f4e79" stroke="#ffffff" stroke-width="3"/>
    <rect x="156" y="${line - 56}" width="164" height="62" rx="2" fill="none" stroke="#ffffff" stroke-width="1"/>
    ${text(238, line - 34, 'CRUE DU', 'middle', 13, 700, '#ffffff')}
    ${text(238, line - 14, '12 OCTOBRE 1958', 'middle', 15, 700, '#ffffff')}
    <path d="M164 ${line}h148" stroke="#ffffff" stroke-width="3"/>
    <polygon points="160,${line} 170,${line - 6} 170,${line + 6}" fill="#ffffff"/>
    <polygon points="316,${line} 306,${line - 6} 306,${line + 6}" fill="#ffffff"/>
    <circle cx="70" cy="${person + 14}" r="13" fill="#1b2733" opacity="0.8"/>
    <path d="M52 ${ground}v-${Math.round(1.7 * scale) - 62}q0-26 18-26t18 26v${Math.round(1.7 * scale) - 62}z" fill="#1b2733" opacity="0.8"/>
    <path d="M372 ${ground}v-${Math.round(height * scale)}" stroke="${INK}" stroke-width="2"/>
    <polygon points="372,${line} 367,${line + 10} 377,${line + 10}" fill="${INK}"/>
    <polygon points="372,${ground} 367,${ground - 10} 377,${ground - 10}" fill="${INK}"/>
    <rect x="336" y="${(line + ground) / 2 - 12}" width="72" height="24" rx="4" fill="#ffffff" opacity="0.9"/>
    ${text(372, (line + ground) / 2 + 5, label, 'middle', 14, 700)}`;
  return wrap(
    svg('0 0 420 260', `Le repère de crue du pont : une plaque émaillée bleue, scellée dans la pierre, qui porte l'inscription « Crue du 12 octobre 1958 ». Le trait qui marque le niveau atteint par l'eau est à ${label} au-dessus du quai, plus haut que les épaules d'un adulte.`, content),
    `Le trait marque le niveau atteint par l'eau le 12 octobre 1958 : ${label} au-dessus du quai.`,
  );
}

const FIGURES = { batardeau, 'zone-refuge': zoneRefuge } as const;

export function lexiconFigure(id: keyof typeof FIGURES): HTMLElement {
  return FIGURES[id]();
}
