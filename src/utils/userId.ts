/** Gera ID local estável o suficiente para métrica e liberação de assinatura. */
export function createUserId() {
  const time = Date.now().toString(36);
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `pv_${time}_${rand}`;
}

export function firstNameFrom(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.split(' ')[0] ?? cleaned;
}
