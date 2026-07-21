import type { AudioSource } from '../types';

/**
 * Narrações das passagens da aba Bíblia (MP3 locais).
 * Amostras geradas com npm run generate:biblia-samples.
 * Só inclui IDs que já têm arquivo — o restante fica só texto.
 * Ordem = prioridade na lista da aba Bíblia.
 */
export const BIBLICAL_PRAYER_AUDIO_ORDER = [
  'pai-nosso',
  'salmo-91',
  'filipenses-4',
  'bencao-aaronica',
  'ISAIAH_41_10',
  'salmo-121',
  'magnificat',
  'salmo-46',
  'salmo-139',
  'salmo-27',
] as const;

const audioRequires: Record<string, number> = {
  'pai-nosso': require('../../assets/audio/biblia-samples/pai-nosso.mp3'),
  'salmo-91': require('../../assets/audio/biblia-samples/salmo-91.mp3'),
  'filipenses-4': require('../../assets/audio/biblia-samples/filipenses-4.mp3'),
  'bencao-aaronica': require('../../assets/audio/biblia-samples/bencao-aaronica.mp3'),
  ISAIAH_41_10: require('../../assets/audio/biblia-samples/ISAIAH_41_10.mp3'),
  'salmo-121': require('../../assets/audio/biblia-samples/salmo-121.mp3'),
  magnificat: require('../../assets/audio/biblia-samples/magnificat.mp3'),
  'salmo-46': require('../../assets/audio/biblia-samples/salmo-46.mp3'),
  'salmo-139': require('../../assets/audio/biblia-samples/salmo-139.mp3'),
  'salmo-27': require('../../assets/audio/biblia-samples/salmo-27.mp3'),
};

const audioOrderIndex = new Map<string, number>(
  BIBLICAL_PRAYER_AUDIO_ORDER.map((id, index) => [id, index]),
);

/** Com áudio primeiro (ordem fixa); demais mantêm a ordem do catálogo. */
export function sortBiblicalPrayersWithAudioFirst<T extends { id: string }>(
  list: T[],
): T[] {
  return [...list].sort((a, b) => {
    const ai = audioOrderIndex.has(a.id)
      ? audioOrderIndex.get(a.id)!
      : Number.POSITIVE_INFINITY;
    const bi = audioOrderIndex.has(b.id)
      ? audioOrderIndex.get(b.id)!
      : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return 0;
  });
}

export function getBiblicalPrayerAudioSource(
  passageId: string,
): AudioSource | undefined {
  return audioRequires[passageId];
}

export function hasBiblicalPrayerAudio(passageId: string) {
  return audioOrderIndex.has(passageId);
}

export function listBiblicalPrayerAudioIds() {
  return [...BIBLICAL_PRAYER_AUDIO_ORDER];
}
