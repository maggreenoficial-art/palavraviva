import {
  getBiblicalTextById,
  type BiblicalText,
} from './biblicalContent';

export type BiblePassage = Omit<BiblicalText, 'id' | 'kind' | 'title' | 'themeLabel'> & {
  reference: string;
  text: string;
  translationName: string;
  verses: Array<{ verse: number; text: string }>;
};

/**
 * Compatibilidade com o fluxo antigo.
 * Fonte única: dataset bíblico local (sem inventar texto).
 */
export async function fetchBiblePassage(
  _apiPassage: string,
  prayerId?: string,
): Promise<BiblePassage> {
  if (!prayerId) {
    throw new Error('Identificador da oração é obrigatório.');
  }

  const text = getBiblicalTextById(prayerId);
  if (!text) {
    throw new Error(
      'Texto bíblico não encontrado no dataset. Nenhum conteúdo foi inventado.',
    );
  }

  return {
    reference: text.reference,
    text: text.text,
    translationName: text.translationName,
    verses: text.verses,
  };
}
