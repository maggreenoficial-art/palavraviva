import {
  biblicalPrayers,
  getPrayerById,
  type BiblicalPrayerMeta,
} from '../constants/biblicalPrayers';
import localPrayers from '../constants/biblicalPrayerTexts.json';

export type ContentKind = 'biblical' | 'devotional' | 'instruction';

export interface BiblicalText {
  id: string;
  kind: 'biblical';
  title: string;
  reference: string;
  translationName: string;
  text: string;
  verses: Array<{ verse: number; text: string }>;
  themeLabel: string;
}

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

export function getBiblicalPrayerById(id: string): BiblicalPrayerMeta | undefined {
  return getPrayerById(id);
}

export function getBiblicalTextById(id: string): BiblicalText | null {
  const text = localMap[id];
  if (!text?.verses?.length || !text.reference || !text.translationName) {
    return null;
  }

  const meta = getPrayerById(id);

  return {
    id,
    kind: 'biblical',
    title: meta?.title ?? text.reference,
    reference: text.reference,
    translationName: text.translationName,
    text: text.text,
    verses: text.verses,
    themeLabel: meta?.themeLabel ?? 'Texto bíblico',
  };
}

export function getPrayerVerses(id: string) {
  return getBiblicalTextById(id)?.verses ?? [];
}

export interface CatalogValidationIssue {
  id: string;
  message: string;
}

export function validateBiblicalPrayerCatalog(): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const seen = new Set<string>();

  for (const prayer of biblicalPrayers) {
    if (!prayer.id) {
      issues.push({ id: '(sem-id)', message: 'Item sem ID.' });
      continue;
    }
    if (seen.has(prayer.id)) {
      issues.push({ id: prayer.id, message: 'ID duplicado no catálogo.' });
    }
    seen.add(prayer.id);

    if (!prayer.referenceLabel) {
      issues.push({ id: prayer.id, message: 'Referência ausente.' });
    }

    const text = localMap[prayer.id];
    if (!text) {
      issues.push({
        id: prayer.id,
        message: 'Texto ausente em biblicalPrayerTexts.json.',
      });
      continue;
    }
    if (!text.reference) {
      issues.push({ id: prayer.id, message: 'Campo reference ausente no JSON.' });
    }
    if (!text.translationName) {
      issues.push({ id: prayer.id, message: 'Fonte/tradução ausente no JSON.' });
    }
    if (!text.verses?.length) {
      issues.push({ id: prayer.id, message: 'Versículos ausentes ou vazios.' });
    }
  }

  return issues;
}

export function listValidBiblicalPrayers(): BiblicalPrayerMeta[] {
  return biblicalPrayers.filter((prayer) => getBiblicalTextById(prayer.id) != null);
}
