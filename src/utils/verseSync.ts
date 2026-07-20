/**
 * Calcula o índice do versículo ativo a partir do progresso do áudio.
 * Usa peso por caracteres — não inventa timestamps literais.
 */

export type VerseSyncOptions = {
  introWeight?: number;
  outroWeight?: number;
  /** Antecipação em ms para o destaque acompanhar a fala */
  leadMs?: number;
  /** Peso extra após cada versículo (pausas na narração) */
  pauseWeight?: number;
};

function cleanWeightText(text: string) {
  return String(text || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getActiveVerseIndex(
  verses: Array<{ text: string }>,
  positionMs: number,
  durationMs: number,
  options: VerseSyncOptions | number = {},
): number {
  if (!verses.length || durationMs <= 0) return 0;

  // Compat: 4º arg numérico antigo = introWeight
  const opts: VerseSyncOptions =
    typeof options === 'number' ? { introWeight: options } : options;

  const introWeight = Math.max(opts.introWeight ?? 72, 24);
  const outroWeight = Math.max(opts.outroWeight ?? 48, 0);
  const pauseWeight = Math.max(opts.pauseWeight ?? 18, 0);
  const leadMs = Math.max(opts.leadMs ?? 700, 0);

  const adjustedPosition = Math.min(durationMs, Math.max(0, positionMs + leadMs));
  const progress = Math.min(1, Math.max(0, adjustedPosition / durationMs));

  type Segment = { verseIndex: number; weight: number };
  const segments: Segment[] = [];

  // Intro conta como “ainda no primeiro versículo”
  segments.push({ verseIndex: 0, weight: introWeight });

  for (let i = 0; i < verses.length; i += 1) {
    const textWeight = Math.max(cleanWeightText(verses[i].text).length, 20);
    const trailingPause = i < verses.length - 1 ? pauseWeight : 0;
    segments.push({
      verseIndex: i,
      weight: textWeight + trailingPause,
    });
  }

  if (outroWeight > 0) {
    segments.push({
      verseIndex: verses.length - 1,
      weight: outroWeight,
    });
  }

  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  const target = progress * total;
  let cursor = 0;

  for (const segment of segments) {
    cursor += segment.weight;
    if (target <= cursor) {
      return segment.verseIndex;
    }
  }

  return verses.length - 1;
}
