import localPrayers from '../constants/biblicalPrayerTexts.json';

type LocalPrayerMap = Record<
  string,
  {
    reference: string;
    translationName: string;
    text: string;
    verses: Array<{ verse: number; text: string }>;
  }
>;

const localMap = localPrayers as LocalPrayerMap;
const MARKER_RE = /\{\{BIBLE:([A-Z0-9_]+)\}\}/g;

export class MissingBiblePassageError extends Error {
  constructor(public readonly passageId: string) {
    super(
      `Passagem bíblica ausente no dataset: ${passageId}. Gere com npm run fetch:prayers. Não invente texto.`,
    );
    this.name = 'MissingBiblePassageError';
  }
}

/** Formata o texto bíblico literal para narração, sem adaptar o conteúdo. */
export function formatBiblicalForNarration(passageId: string): string {
  const passage = localMap[passageId];
  if (!passage?.text?.trim() || !passage.reference || !passage.verses?.length) {
    throw new MissingBiblePassageError(passageId);
  }

  const verseText = passage.verses.map((v) => v.text).join(' ');
  return `${passage.reference}. ${verseText}`;
}

/**
 * Resolve marcadores {{BIBLE:ID}} com texto literal do dataset.
 * Falha se qualquer marcador não existir. Nunca inventa texto.
 */
export function resolveBibleMarkers(script: string): {
  resolved: string;
  usedPassageIds: string[];
} {
  const used = new Set<string>();
  const resolved = script.replace(MARKER_RE, (_match, passageId: string) => {
    used.add(passageId);
    const narrated = formatBiblicalForNarration(passageId);
    return `\n<break time="1.0s" />\n${narrated}\n<break time="1.0s" />\n`;
  });

  const leftover = resolved.match(MARKER_RE);
  if (leftover?.length) {
    throw new Error(
      `Marcadores não resolvidos restantes: ${leftover.join(', ')}`,
    );
  }

  return {
    resolved: resolved.replace(/\n{3,}/g, '\n\n').trim(),
    usedPassageIds: [...used],
  };
}

export function listRequiredBibleMarkers(script: string): string[] {
  return [...script.matchAll(MARKER_RE)].map((match) => match[1]);
}

export function assertAllMarkersExist(script: string) {
  const ids = listRequiredBibleMarkers(script);
  for (const id of ids) {
    if (!localMap[id]?.verses?.length) {
      throw new MissingBiblePassageError(id);
    }
  }
}
