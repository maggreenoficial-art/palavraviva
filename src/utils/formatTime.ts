/** Formata ms para m:ss; evita NaN quando a duração ainda não carregou. */
export function formatTime(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '--:--';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimeOrZero(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  return formatTime(ms);
}
