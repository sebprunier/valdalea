"""Enregistre les bulletins de la radio du kit d'urgence.

Le jeu n'embarque aucun moteur de synthèse vocale : les bulletins de
`src/content/radio.json` sont lus ici, une fois pour toutes, par Piper, et le jeu
ne charge que les petits fichiers audio de `public/radio/`.

    npm run radio            enregistre les bulletins dont le texte a changé
    npm run radio -- --tout  les enregistre tous de nouveau
    npm run radio -- --phonemes   montre comment la voix prononcera chaque texte

Il faut `uv` (https://docs.astral.sh/uv/) : il installe Piper et l'encodeur MP3
dans un environnement à part, sans toucher au projet. À la première exécution, la
voix (63 Mo) est téléchargée depuis le dépôt officiel des voix de Piper, dans
`node_modules/.cache/piper-voix/`.

La voix : `fr_FR-siwis-medium`, entraînée sur « The SIWIS French Speech Synthesis
Database » (Yamagishi, Honnet, Garner, Lazaridis, université d'Édimbourg, 2017,
https://doi.org/10.7488/ds/1705), sous licence CC BY 4.0. Piper lui-même est sous
licence GPL 3 : il sert à fabriquer les fichiers, et n'est pas distribué avec le jeu.

`src/content/radio.clips.json` garde l'empreinte du texte lu pour chaque fichier :
les tests du jeu refusent un bulletin dont le texte ne correspond plus à sa voix.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

VOICE = "fr_FR-siwis-medium"
ROOT = Path(__file__).resolve().parent.parent
TEXTS = ROOT / "src" / "content" / "radio.json"
CLIPS = ROOT / "src" / "content" / "radio.clips.json"
OUT = ROOT / "public" / "radio"
VOICES = ROOT / "node_modules" / ".cache" / "piper-voix"

# Débit de parole : 1 est celui de la voix ; au-dessus, elle ralentit.
LENGTH_SCALE = 1.0
# Silences, en secondes : entre deux phrases, entre deux paragraphes, au début et à la fin.
PAUSE_SENTENCE = 0.16
PAUSE_PARAGRAPH = 0.42
PAUSE_EDGE = 0.12
# MP3 mono à 32 kbit/s : environ 4 Ko par seconde, lisible par tous les navigateurs.
BITRATE = 32
PEAK = 0.89


def spoken(bulletin: dict) -> str:
    """Le texte donné à lire : un paragraphe par ligne. Même règle que `spokenText`, côté jeu."""
    return "\n".join(bulletin["paragraphs"])


def fingerprint(bulletin: dict) -> str:
    return hashlib.sha256(spoken(bulletin).encode("utf-8")).hexdigest()


def load_voice():
    from piper import PiperVoice
    from piper.download_voices import download_voice

    model = VOICES / f"{VOICE}.onnx"
    if not model.exists() or not model.with_suffix(".onnx.json").exists():
        print(f"Téléchargement de la voix {VOICE} (63 Mo) depuis huggingface.co/rhasspy/piper-voices…")
        VOICES.mkdir(parents=True, exist_ok=True)
        download_voice(VOICE, VOICES)
    return PiperVoice.load(model)


def record(voice, bulletin: dict):
    """Lit le bulletin, paragraphe après paragraphe. Renvoie les échantillons (16 bits, mono) et leur fréquence."""
    import numpy as np
    from piper import SynthesisConfig

    rate = voice.config.sample_rate
    config = SynthesisConfig(length_scale=LENGTH_SCALE)
    silence = lambda seconds: np.zeros(round(rate * seconds), dtype=np.int16)
    parts = [silence(PAUSE_EDGE)]
    for index, paragraph in enumerate(bulletin["paragraphs"]):
        if index > 0:
            parts.append(silence(PAUSE_PARAGRAPH))
        sentences = [chunk.audio_int16_array for chunk in voice.synthesize(paragraph, config)]
        for position, sentence in enumerate(sentences):
            if position > 0:
                parts.append(silence(PAUSE_SENTENCE))
            parts.append(sentence)
    parts.append(silence(PAUSE_EDGE))
    samples = np.concatenate(parts).astype(np.float64)
    peak = float(np.max(np.abs(samples))) or 1.0
    return (samples * (PEAK * 32767 / peak)).astype(np.int16), rate


def encode(samples, rate: int) -> bytes:
    import lameenc

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(BITRATE)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return bytes(encoder.encode(samples.tobytes())) + bytes(encoder.flush())


def main() -> int:
    parser = argparse.ArgumentParser(description="Enregistre les bulletins de la radio du kit d'urgence.")
    parser.add_argument("--tout", action="store_true", help="enregistrer de nouveau tous les bulletins, même inchangés")
    parser.add_argument("--phonemes", action="store_true", help="montrer la prononciation de chaque phrase, sans rien enregistrer")
    args = parser.parse_args()

    bulletins = json.loads(TEXTS.read_text(encoding="utf-8"))
    clips = json.loads(CLIPS.read_text(encoding="utf-8")) if CLIPS.exists() else {}

    if args.phonemes:
        voice = load_voice()
        for name, bulletin in bulletins.items():
            print(f"\n{name}")
            for paragraph in bulletin["paragraphs"]:
                for sentence in voice.phonemize(paragraph):
                    print("  " + "".join(sentence))
        return 0

    def fresh(name: str) -> bool:
        clip = clips.get(name)
        file = OUT / f"{name}.mp3"
        return bool(clip) and clip["voice"] == VOICE and clip["text"] == fingerprint(bulletins[name]) and file.exists() and file.stat().st_size == clip["bytes"]

    todo = [name for name in bulletins if args.tout or not fresh(name)]
    # Un enregistrement dont le bulletin n'existe plus n'a plus lieu d'être publié.
    OUT.mkdir(parents=True, exist_ok=True)
    for file in sorted(OUT.glob("*.mp3")):
        if file.stem not in bulletins:
            print(f"- {file.name} : bulletin supprimé, enregistrement retiré")
            file.unlink()
    clips = {name: clip for name, clip in clips.items() if name in bulletins}

    if todo:
        voice = load_voice()
        for name in todo:
            samples, rate = record(voice, bulletins[name])
            data = encode(samples, rate)
            (OUT / f"{name}.mp3").write_bytes(data)
            clips[name] = {"voice": VOICE, "text": fingerprint(bulletins[name]), "seconds": round(len(samples) / rate, 1), "bytes": len(data)}
            print(f"+ {name}.mp3 : {clips[name]['seconds']} s, {len(data) / 1000:.0f} Ko")
    for name in bulletins:
        if name not in todo:
            print(f"= {name}.mp3 : inchangé")

    CLIPS.write_text(json.dumps({name: clips[name] for name in bulletins}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
