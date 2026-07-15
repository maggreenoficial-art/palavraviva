/**
 * Catálogo de orações bíblicas reais.
 * O texto NÃO é inventado — só a referência; o conteúdo vem do dataset bíblico local.
 */
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

export const biblicalPrayers: BiblicalPrayerMeta[] = [
  {
    id: 'pai-nosso',
    title: 'Pai Nosso',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'mateus 6:9-13',
    referenceLabel: 'Mateus 6:9-13',
  },
  {
    id: 'salmo-23',
    title: 'O Senhor é o meu pastor',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'salmos 23:1-6',
    referenceLabel: 'Salmo 23:1-6',
  },
  {
    id: 'salmo-91',
    title: 'Aquele que habita no esconderijo do Altíssimo',
    theme: 'protecao',
    themeLabel: 'Proteção',
    apiPassage: 'salmos 91:1-16',
    referenceLabel: 'Salmo 91:1-16',
  },
  {
    id: 'salmo-51',
    title: 'Oração de arrependimento de Davi',
    theme: 'arrependimento',
    themeLabel: 'Arrependimento',
    apiPassage: 'salmos 51:1-12',
    referenceLabel: 'Salmo 51:1-12',
  },
  {
    id: 'bencao-aaronica',
    title: 'Bênção Aarônica',
    theme: 'bencao',
    themeLabel: 'Bênção',
    apiPassage: 'numeros 6:24-26',
    referenceLabel: 'Números 6:24-26',
  },
  {
    id: 'salmo-121',
    title: 'O Senhor é o teu guarda',
    theme: 'protecao',
    themeLabel: 'Proteção',
    apiPassage: 'salmos 121:1-8',
    referenceLabel: 'Salmo 121:1-8',
  },
  {
    id: 'salmo-46',
    title: 'Deus é o nosso refúgio e fortaleza',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'salmos 46:1-11',
    referenceLabel: 'Salmo 46:1-11',
  },
  {
    id: 'filipenses-4',
    title: 'Não andeis ansiosos',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'php 4:6-7',
    referenceLabel: 'Filipenses 4:6-7',
  },
  {
    id: 'salmo-27',
    title: 'O Senhor é a minha luz e a minha salvação',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'salmos 27:1-14',
    referenceLabel: 'Salmo 27:1-14',
  },
  {
    id: 'magnificat',
    title: 'Cântico de Maria',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: 'lucas 1:46-55',
    referenceLabel: 'Lucas 1:46-55',
  },
  {
    id: 'oracao-jonas',
    title: 'Oração de Jonas',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: 'jonas 2:1-9',
    referenceLabel: 'Jonas 2:1-9',
  },
  {
    id: '1KINGS_8_22_30',
    title: 'Dedicação do Templo — Salomão',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: '1 reis 8:22-30',
    referenceLabel: '1 Reis 8:22-30',
  },
  {
    id: '1SAMUEL_2_1_10',
    title: 'Cântico de Ana',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: '1 samuel 2:1-10',
    referenceLabel: '1 Samuel 2:1-10',
  },
  {
    id: '1KINGS_18_36_39',
    title: 'Oração de Elias no Carmelo',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: '1 reis 18:36-39',
    referenceLabel: '1 Reis 18:36-39',
  },
  {
    id: '1CHRONICLES_4_10',
    title: 'Oração de Jabez',
    theme: 'bencao',
    themeLabel: 'Bênção',
    apiPassage: '1 cronicas 4:10',
    referenceLabel: '1 Crônicas 4:10',
  },
  {
    id: 'DANIEL_9_4_19',
    title: 'Intercessão de Daniel',
    theme: 'arrependimento',
    themeLabel: 'Arrependimento',
    apiPassage: 'daniel 9:4-19',
    referenceLabel: 'Daniel 9:4-19',
  },
  {
    id: 'HABAKKUK_3_17_19',
    title: 'Ainda que a figueira não floresça',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'habacuque 3:17-19',
    referenceLabel: 'Habacuque 3:17-19',
  },
  {
    id: 'EXODUS_32_11_14',
    title: 'Intercessão de Moisés',
    theme: 'arrependimento',
    themeLabel: 'Arrependimento',
    apiPassage: 'exodo 32:11-14',
    referenceLabel: 'Êxodo 32:11-14',
  },
  {
    id: 'getsemani',
    title: 'Oração de Jesus no Getsêmani',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'mateus 26:39-42',
    referenceLabel: 'Mateus 26:39-42',
  },
  {
    id: 'salmo-139',
    title: 'Senhor, tu me sondas e me conheces',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'salmos 139:1-14',
    referenceLabel: 'Salmo 139:1-14',
  },
  {
    id: 'salmo-4',
    title: 'Em paz me deitarei e dormirei',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'salmos 4:1-8',
    referenceLabel: 'Salmo 4:1-8',
  },
  {
    id: 'isaias-41',
    title: 'Não temas, porque eu sou contigo',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'isaias 41:10-13',
    referenceLabel: 'Isaías 41:10-13',
  },
  {
    id: 'PSALM_56_3_4',
    title: 'No dia em que eu temer',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'salmos 56:3-4',
    referenceLabel: 'Salmo 56:3-4',
  },
  {
    id: '1_PETER_5_7',
    title: 'Lançando sobre ele toda a vossa ansiedade',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: '1 pedro 5:7',
    referenceLabel: '1 Pedro 5:7',
  },
  {
    id: 'PHILIPPIANS_4_6_7',
    title: 'Não andeis ansiosos (Filipenses)',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'php 4:6-7',
    referenceLabel: 'Filipenses 4:6-7',
  },
  {
    id: 'MATTHEW_6_31_34',
    title: 'Não vos inquieteis pelo dia de amanhã',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'mateus 6:31-34',
    referenceLabel: 'Mateus 6:31-34',
  },
  {
    id: 'MATTHEW_11_28_30',
    title: 'Vinde a mim, todos os que estais cansados',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'mateus 11:28-30',
    referenceLabel: 'Mateus 11:28-30',
  },
  {
    id: 'ISAIAH_41_10',
    title: 'Não temas, porque eu sou contigo',
    theme: 'protecao',
    themeLabel: 'Proteção',
    apiPassage: 'isaias 41:10',
    referenceLabel: 'Isaías 41:10',
  },
  {
    id: 'PSALM_4_8',
    title: 'Em paz me deitarei e dormirei',
    theme: 'ansiedade',
    themeLabel: 'Paz na ansiedade',
    apiPassage: 'salmos 4:8',
    referenceLabel: 'Salmo 4:8',
  },
  {
    id: 'PSALM_23_1_4',
    title: 'O Senhor é o meu pastor',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'salmos 23:1-4',
    referenceLabel: 'Salmo 23:1-4',
  },
  {
    id: 'LAMENTATIONS_3_21_23',
    title: 'As misericórdias do Senhor se renovam',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: 'lamentacoes 3:21-23',
    referenceLabel: 'Lamentações 3:21-23',
  },
  {
    id: '1CORINTHIANS_13_1_3',
    title: 'Sem amor, nada sou',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: '1 corintios 13:1-3',
    referenceLabel: '1 Coríntios 13:1-3',
  },
  {
    id: '1CORINTHIANS_13_4_7',
    title: 'O amor é paciente',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: '1 corintios 13:4-7',
    referenceLabel: '1 Coríntios 13:4-7',
  },
  {
    id: '1CORINTHIANS_13_13',
    title: 'O maior deles é o amor',
    theme: 'louvor',
    themeLabel: 'Louvor',
    apiPassage: '1 corintios 13:13',
    referenceLabel: '1 Coríntios 13:13',
  },
  {
    id: 'GENESIS_1_1_5',
    title: 'Haja luz',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'genesis 1:1-5',
    referenceLabel: 'Gênesis 1:1-5',
  },
  {
    id: 'HEBREWS_11_1',
    title: 'A fé é a certeza',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'hebreus 11:1',
    referenceLabel: 'Hebreus 11:1',
  },
  {
    id: 'PROVERBS_16_32',
    title: 'Melhor o longânimo do que o valente',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'proverbios 16:32',
    referenceLabel: 'Provérbios 16:32',
  },
  {
    id: 'GALATIANS_5_22_23',
    title: 'O fruto do Espírito',
    theme: 'ensino',
    themeLabel: 'Ensino de Jesus',
    apiPassage: 'galatas 5:22-23',
    referenceLabel: 'Gálatas 5:22-23',
  },
  {
    id: 'PROVERBS_16_3',
    title: 'Confia ao Senhor as tuas obras',
    theme: 'confianca',
    themeLabel: 'Confiança',
    apiPassage: 'proverbios 16:3',
    referenceLabel: 'Provérbios 16:3',
  },
];

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
