/** Máscara de WhatsApp BR: (11) 99999-9999 */
export function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function whatsappDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'elo'
  | 'hipercard'
  | null;

const ELO_PREFIXES = [
  '401178',
  '401179',
  '431274',
  '438935',
  '451416',
  '457393',
  '457631',
  '457632',
  '504175',
  '627780',
  '636297',
  '636368',
  '636369',
];

/**
 * Detecta bandeira a partir do BIN (primeiros dígitos).
 * Com ~6 dígitos a detecção fica estável na maioria dos casos.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) return null;

  // Elo (antes de Visa — alguns BINs começam com 4)
  if (ELO_PREFIXES.some((p) => digits.startsWith(p))) return 'elo';
  if (digits.length >= 3 && digits.startsWith('650')) return 'elo';

  if (/^606282|^3841(00|40|60)/.test(digits)) return 'hipercard';

  if (/^3[47]/.test(digits)) return 'amex';

  if (/^5[1-5]/.test(digits)) return 'mastercard';
  if (digits.length >= 4) {
    const bin4 = Number(digits.slice(0, 4));
    if (bin4 >= 2221 && bin4 <= 2720) return 'mastercard';
  }

  if (digits.startsWith('4')) return 'visa';

  return null;
}

export function formatCardNumberByBrand(value: string, brand: CardBrand) {
  const max = brand === 'amex' ? 15 : 16;
  const digits = value.replace(/\D/g, '').slice(0, max);
  if (brand === 'amex') {
    const a = digits.slice(0, 4);
    const b = digits.slice(4, 10);
    const c = digits.slice(10, 15);
    return [a, b, c].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
