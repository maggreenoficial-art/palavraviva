/**
 * Calcula o índice do versículo ativo a partir do progresso do áudio.
 * Usa peso por caracteres — não inventa timestamps literais.
 * `introWeight` cobre a abertura falada antes dos versículos.
 */
export function getActiveVerseIndex(
  verses: Array<{ text: string }>,
  positionMs: number,
  durationMs: number,
  introWeight = 160,
): number {
  if (!verses.length || durationMs <= 0) return 0;
  const progress = Math.min(1, Math.max(0, positionMs / durationMs));
  const weights = [
    Math.max(introWeight, 80),
    ...verses.map((verse) => Math.max(verse.text.length, 24)),
  ];
  const total = weights.reduce((sum, w) => sum + w, 0);
  let cursor = 0;
  const target = progress * total;

  for (let i = 0; i < weights.length; i += 1) {
    cursor += weights[i];
    if (target <= cursor) {
      // i === 0 → ainda na introdução falada
      return i === 0 ? 0 : i - 1;
    }
  }
  return verses.length - 1;
}
