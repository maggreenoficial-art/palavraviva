/**
 * Catálogo de orações bíblicas reais.
 * O texto NÃO é inventado — só a referência; o conteúdo vem do dataset bíblico local.
 */
import catalog from './biblicalPrayerCatalog.json';

export type PrayerTheme =
  | 'ensino'
  | 'protecao'
  | 'arrependimento'
  | 'confianca'
  | 'louvor'
  | 'ansiedade'
  | 'bencao';

export interface BiblicalPrayerMeta {
  id: string;
  /** Nome tradicional da passagem (não é texto inventado) */
  title: string;
  theme: PrayerTheme;
  themeLabel: string;
  /** Referência legível da passagem */
  apiPassage: string;
  /** Referência exibida em português */
  referenceLabel: string;
}

type CatalogEntry = {
  id: string;
  title: string;
  theme: PrayerTheme;
  themeLabel: string;
  apiPassage: string;
  referenceLabel: string;
};

export const biblicalPrayers: BiblicalPrayerMeta[] = (
  catalog as CatalogEntry[]
).map(({ id, title, theme, themeLabel, apiPassage, referenceLabel }) => ({
  id,
  title,
  theme,
  themeLabel,
  apiPassage,
  referenceLabel,
}));

export const prayerThemes: Array<{ id: PrayerTheme | 'todas'; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'protecao', label: 'Proteção' },
  { id: 'confianca', label: 'Confiança' },
  { id: 'ensino', label: 'Jesus' },
  { id: 'louvor', label: 'Louvor' },
  { id: 'arrependimento', label: 'Arrependimento' },
  { id: 'bencao', label: 'Bênção' },
];

export function getPrayerById(id: string) {
  return biblicalPrayers.find((prayer) => prayer.id === id);
}
