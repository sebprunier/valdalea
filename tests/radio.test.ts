import { existsSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS, playbookOf } from '../src/content/chapitres';
import { KIT_CONTENTS } from '../src/content/kit';
import { SOURCES } from '../src/content/model';
import { RADIO_BULLETINS, RADIO_CLIPS, radioClip, spokenText, STATION } from '../src/content/radio';

/** Les bulletins de radio que le récit fait entendre, avec le lieu où le joueur se trouve à ce moment-là. */
/** Empreinte SHA-256 d'un texte, comme la calcule le script d'enregistrement. */
async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const heard = CHAPTERS.flatMap((info) => {
  const crisis = playbookOf(info.id).content?.crisis;
  if (!crisis) return [];
  return (['vigilance', 'onset'] as const).flatMap((part) =>
    crisis[part].flatMap((beat, index) =>
      'bulletin' in beat && beat.bulletin.kind === 'radio' ? [{ chapter: info.id, bulletin: beat.bulletin, place: crisis.places[part === 'vigilance' ? 'vigilance' : 'crise'], before: crisis[part][index - 1] }] : [],
    ),
  );
});

describe("radio du kit d'urgence", () => {
  it('est dans la liste officielle du kit : une radio à piles, pour suivre les consignes', () => {
    expect(KIT_CONTENTS.some((item) => /radio à piles/.test(item) && /consignes des autorités/.test(item))).toBe(true);
  });

  it("ne parle que là où le kit se trouve : chez soi, après le message ou l'alerte du téléphone", () => {
    expect(heard.length).toBeGreaterThan(0);
    for (const { chapter, bulletin, place, before } of heard) {
      expect(place, `${chapter} : ${bulletin.id}`).toBe('domicile');
      expect(before && 'bulletin' in before && before.bulletin.kind !== 'radio', `${chapter} : ${bulletin.id}`).toBe(true);
    }
  });

  it('fait entendre chaque bulletin écrit, une fois, sous le nom de la station', () => {
    expect(heard.map(({ bulletin }) => bulletin.id).sort()).toEqual(RADIO_BULLETINS.map((bulletin) => bulletin.id).sort());
    for (const bulletin of RADIO_BULLETINS) {
      expect(bulletin.kind, bulletin.id).toBe('radio');
      expect(bulletin.from, bulletin.id).toBe(STATION);
      expect(bulletin.paragraphs[0], bulletin.id).toContain(STATION);
      expect(bulletin.paragraphs.length, bulletin.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('cite la source officielle des consignes données à l’antenne', () => {
    for (const bulletin of RADIO_BULLETINS) {
      expect(bulletin.sources.length, bulletin.id).toBeGreaterThan(0);
      for (const source of bulletin.sources) expect(SOURCES[source], `${bulletin.id} : ${source}`).toBeDefined();
    }
  });

  it('écrit ce que la voix dit : pas de chiffres ni de sigles laissés à sa fantaisie', () => {
    for (const bulletin of RADIO_BULLETINS) {
      for (const paragraph of bulletin.paragraphs) {
        expect(paragraph, bulletin.id).not.toMatch(/\d/);
        expect(paragraph, bulletin.id).not.toMatch(/\b[A-Z]{2,}\b/);
      }
    }
  });

  it("a l'enregistrement de chaque bulletin, tiré du texte affiché : la transcription et la voix disent la même chose", async () => {
    for (const bulletin of RADIO_BULLETINS) {
      const clip = RADIO_CLIPS[bulletin.id];
      expect(clip, `${bulletin.id} : lancer « npm run radio »`).toBeDefined();
      expect(clip.text, `${bulletin.id} : texte modifié sans sa voix, lancer « npm run radio »`).toBe(await fingerprint(spokenText(bulletin)));
      const file = `public/${radioClip(bulletin.id)}`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBe(clip.bytes);
      expect(clip.voice.length, bulletin.id).toBeGreaterThan(0);
    }
  });

  it('reste léger : un flash court, un petit fichier, et aucun enregistrement orphelin', () => {
    for (const bulletin of RADIO_BULLETINS) {
      const clip = RADIO_CLIPS[bulletin.id];
      expect(clip.seconds, bulletin.id).toBeLessThanOrEqual(40);
      expect(clip.bytes, bulletin.id).toBeLessThan(200_000);
    }
    expect(Object.keys(RADIO_CLIPS).sort()).toEqual(RADIO_BULLETINS.map((bulletin) => bulletin.id).sort());
    expect(readdirSync('public/radio').filter((name) => name.endsWith('.mp3')).sort()).toEqual(RADIO_BULLETINS.map((bulletin) => `${bulletin.id}.mp3`).sort());
  });
});
