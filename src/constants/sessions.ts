import { anxietyJourney } from './anxietyJourney';
import type { Session } from '../types';

/**
 * Sessões de áudio.
 * Textos em `summary` são instrucionais/devocionais — NÃO são versículos.
 * Passagens bíblicas vêm só via biblicalPrayerId(s) → dataset bíblico local.
 */
export const baseSessions: Session[] = [
  {
    id: 'sos-paz',
    title: 'SOS — Paz Imediata',
    subtitle: 'Oração de crise · Apoio espiritual',
    summary:
      'Um momento curto para respirar, orar e acolher o coração com a Palavra.',
    category: 'sos',
    durationSeconds: 102,
    audioSource: require('../../assets/audio/sos-paz.mp3'),
    ambientSource: require('../../assets/audio/ambient/sos-paz.mp3'),
    ambientVolume: 0.12,
    biblicalPrayerId: 'PHILIPPIANS_4_6_7',
    biblicalPrayerIds: ['PHILIPPIANS_4_6_7'],
    coverColor: '#1B2E3A',
    coverImage: require('../../assets/thumbnails/sos-paz.jpg'),
  },
  {
    id: 'manha-01',
    title: 'Despertar em Gratidão',
    subtitle: 'Oração matinal',
    summary:
      'Comece o dia com gratidão e entrega, pedindo sabedoria e paz para o caminho.',
    category: 'manha',
    durationSeconds: 112,
    audioSource: require('../../assets/audio/manha-01.mp3'),
    ambientSource: require('../../assets/audio/ambient/manha-01.mp3'),
    ambientVolume: 0.12,
    biblicalPrayerId: 'PSALM_23_1_4',
    biblicalPrayerIds: ['PSALM_23_1_4'],
    coverColor: '#1A3340',
  },
  {
    id: 'noite-01',
    title: 'Entrega do Dia',
    subtitle: 'Oração noturna',
    summary:
      'Solte o peso da rotina e entregue ao Senhor o que ainda inquieta a mente.',
    category: 'noite',
    durationSeconds: 113,
    audioSource: require('../../assets/audio/noite-01.mp3'),
    ambientSource: require('../../assets/audio/ambient/noite-01.mp3'),
    ambientVolume: 0.12,
    biblicalPrayerId: 'salmo-46',
    biblicalPrayerIds: ['salmo-46'],
    coverColor: '#172536',
  },
  {
    id: 'noite-02',
    title: 'Silêncio Sagrado',
    subtitle: 'Oração de descanso',
    summary:
      'Um momento mais lento para quietude, confiança e descanso na presença de Deus.',
    category: 'noite',
    durationSeconds: 99,
    audioSource: require('../../assets/audio/noite-02.mp3'),
    ambientSource: require('../../assets/audio/ambient/noite-02.mp3'),
    ambientVolume: 0.1,
    biblicalPrayerId: 'PSALM_4_8',
    biblicalPrayerIds: ['PSALM_4_8'],
    coverColor: '#141F2C',
  },
];

const journeyAudioRequires: Record<string, number> = {
  'ansiedade-01': require('../../assets/audio/ansiedade-01.mp3'),
  'ansiedade-02': require('../../assets/audio/ansiedade-02.mp3'),
  'ansiedade-03': require('../../assets/audio/ansiedade-03.mp3'),
  'sobrecarga-01': require('../../assets/audio/sobrecarga-01.mp3'),
  'medo-01': require('../../assets/audio/medo-01.mp3'),
  'noite-ansiedade-01': require('../../assets/audio/noite-ansiedade-01.mp3'),
  'manha-esperanca-01': require('../../assets/audio/manha-esperanca-01.mp3'),
};

const journeyAmbientRequires: Record<string, number> = {
  'ansiedade-01': require('../../assets/audio/ambient/ansiedade-01.mp3'),
  'ansiedade-02': require('../../assets/audio/ambient/ansiedade-02.mp3'),
  'ansiedade-03': require('../../assets/audio/ambient/ansiedade-03.mp3'),
  'sobrecarga-01': require('../../assets/audio/ambient/sobrecarga-01.mp3'),
  'medo-01': require('../../assets/audio/ambient/medo-01.mp3'),
  'noite-ansiedade-01': require('../../assets/audio/ambient/noite-ansiedade-01.mp3'),
  'manha-esperanca-01': require('../../assets/audio/ambient/manha-esperanca-01.mp3'),
};

const journeyCoverRequires: Record<string, number> = {
  'ansiedade-01': require('../../assets/thumbnails/ansiedade-01.jpg'),
  'ansiedade-02': require('../../assets/thumbnails/ansiedade-02.jpg'),
  'ansiedade-03': require('../../assets/thumbnails/ansiedade-03.jpg'),
  'sobrecarga-01': require('../../assets/thumbnails/sobrecarga-01.jpg'),
  'medo-01': require('../../assets/thumbnails/medo-01.jpg'),
  'noite-ansiedade-01': require('../../assets/thumbnails/noite-ansiedade-01.jpg'),
  'manha-esperanca-01': require('../../assets/thumbnails/manha-esperanca-01.jpg'),
};

export const journeySessions: Session[] = anxietyJourney.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: `Dia ${item.day} · Continue quando quiser`,
  summary: item.summary,
  category: 'jornada' as const,
  durationSeconds: item.durationEstimateSeconds,
  audioSource: journeyAudioRequires[item.id],
  ambientSource: journeyAmbientRequires[item.id],
  ambientVolume: item.ambientVolume,
  biblicalPrayerId: item.bibleMarkerIds[0],
  biblicalPrayerIds: item.bibleMarkerIds,
  journeyDay: item.day,
  coverColor: item.coverColor,
  coverImage: journeyCoverRequires[item.id],
}));

const meditationMeta = [
  {
    id: 'amor-acalma-01',
    title: 'O Amor que Acalma',
    subtitle: 'Meditação em 1 Coríntios 13',
    summary:
      'Uma meditação acolhedora sobre o amor que permanece, com a Palavra de 1 Coríntios 13.',
    biblicalPrayerIds: [
      '1CORINTHIANS_13_1_3',
      '1CORINTHIANS_13_4_7',
      '1CORINTHIANS_13_13',
    ],
    coverColor: '#2A2438',
    ambientVolume: 0.12,
    durationSeconds: 132,
  },
  {
    id: 'ordem-caos-01',
    title: 'Ordem no Caos',
    subtitle: 'Meditação em Gênesis 1',
    summary:
      'Uma meditação lenta sobre a criação: onde havia trevas, Deus disse haja luz.',
    biblicalPrayerIds: ['GENESIS_1_1_5'],
    coverColor: '#1A2E28',
    ambientVolume: 0.14,
    durationSeconds: 107,
  },
  {
    id: 'certeza-fe-01',
    title: 'A Certeza no Meio da Incerteza',
    subtitle: 'Meditação em Hebreus 11',
    summary:
      'Uma meditação inspiradora sobre a fé como certeza do que se espera, mesmo sem ver.',
    biblicalPrayerIds: ['HEBREWS_11_1'],
    coverColor: '#243448',
    ambientVolume: 0.11,
    durationSeconds: 111,
  },
] as const;

const meditationAudioRequires: Record<string, number> = {
  'amor-acalma-01': require('../../assets/audio/amor-acalma-01.mp3'),
  'ordem-caos-01': require('../../assets/audio/ordem-caos-01.mp3'),
  'certeza-fe-01': require('../../assets/audio/certeza-fe-01.mp3'),
};

const meditationAmbientRequires: Record<string, number> = {
  'amor-acalma-01': require('../../assets/audio/ambient/amor-acalma-01.mp3'),
  'ordem-caos-01': require('../../assets/audio/ambient/ordem-caos-01.mp3'),
  'certeza-fe-01': require('../../assets/audio/ambient/certeza-fe-01.mp3'),
};

const meditationCoverRequires: Record<string, number> = {
  'amor-acalma-01': require('../../assets/thumbnails/amor-acalma-01.jpg'),
  'ordem-caos-01': require('../../assets/thumbnails/ordem-caos-01.jpg'),
  'certeza-fe-01': require('../../assets/thumbnails/certeza-fe-01.jpg'),
};

export const meditationSessions: Session[] = meditationMeta.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  summary: item.summary,
  category: 'reflexao' as const,
  durationSeconds: item.durationSeconds,
  audioSource: meditationAudioRequires[item.id],
  ambientSource: meditationAmbientRequires[item.id],
  ambientVolume: item.ambientVolume,
  biblicalPrayerId: item.biblicalPrayerIds[0],
  biblicalPrayerIds: [...item.biblicalPrayerIds],
  coverColor: item.coverColor,
  coverImage: meditationCoverRequires[item.id],
}));

const ecosystemMeta = [
  {
    id: 'eco-ansiedade-01',
    title: 'Quando a mente não para',
    subtitle: 'Dia 1 · Reduzir a ansiedade',
    summary:
      'História, Palavra e prática para entregar uma preocupação por vez. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['PHILIPPIANS_4_6_7', '1_PETER_5_7'],
    coverColor: '#1F3340',
    ambientVolume: 0.11,
    durationSeconds: 276,
    day: 1,
    ambientKey: 'ansiedade-01',
  },
  {
    id: 'eco-controle-01',
    title: 'O espaço entre o impulso e a escolha',
    subtitle: 'Dia 2 · Autocontrole',
    summary:
      'História e Palavra sobre domínio próprio, com uma pausa prática antes de reagir. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['PROVERBS_16_32', 'GALATIANS_5_22_23'],
    coverColor: '#2A281F',
    ambientVolume: 0.11,
    durationSeconds: 278,
    day: 2,
    ambientKey: 'medo-01',
  },
  {
    id: 'eco-ordem-01',
    title: 'Três prioridades com Deus',
    subtitle: 'Dia 3 · Organizar a vida',
    summary:
      'Do caos das tarefas a três prioridades confiadas ao Senhor. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['MATTHEW_6_31_34', 'PROVERBS_16_3'],
    coverColor: '#243448',
    ambientVolume: 0.1,
    durationSeconds: 278,
    day: 3,
    ambientKey: 'manha-esperanca-01',
  },
] as const;

const ecosystemAudioRequires: Record<string, number> = {
  'eco-ansiedade-01': require('../../assets/audio/eco-ansiedade-01.mp3'),
  'eco-controle-01': require('../../assets/audio/eco-controle-01.mp3'),
  'eco-ordem-01': require('../../assets/audio/eco-ordem-01.mp3'),
};

const ecosystemAmbientRequires: Record<string, number> = {
  'ansiedade-01': require('../../assets/audio/ambient/ansiedade-01.mp3'),
  'medo-01': require('../../assets/audio/ambient/medo-01.mp3'),
  'manha-esperanca-01': require('../../assets/audio/ambient/manha-esperanca-01.mp3'),
};

const ecosystemCoverRequires: Record<string, number> = {
  'eco-ansiedade-01': require('../../assets/thumbnails/eco-ansiedade-01.jpg'),
  'eco-controle-01': require('../../assets/thumbnails/eco-controle-01.jpg'),
  'eco-ordem-01': require('../../assets/thumbnails/eco-ordem-01.jpg'),
};

export const ecosystemSessions: Session[] = ecosystemMeta.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  summary: item.summary,
  category: 'serie' as const,
  durationSeconds: item.durationSeconds,
  audioSource: ecosystemAudioRequires[item.id],
  ambientSource: ecosystemAmbientRequires[item.ambientKey],
  ambientVolume: item.ambientVolume,
  biblicalPrayerId: item.biblicalPrayerIds[0],
  biblicalPrayerIds: [...item.biblicalPrayerIds],
  journeyDay: item.day,
  seriesId: 'eco',
  seriesTitle: '3 dias: mente, controle e ordem',
  coverColor: item.coverColor,
  coverImage: ecosystemCoverRequires[item.id],
}));

/** Séries premium Manus (teologia + psicologia positiva) */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const premiumSeriesMeta = require('./premiumSeriesMeta.json') as Record<
  string,
  {
    title: string;
    subtitle: string;
    summary: string;
    coverColor: string;
    seriesId: string;
    seriesTitle: string;
    seriesDay: number;
    biblicalPrayerIds: string[];
    ambientVolume: number;
    durationSeconds: number;
  }
>;

const premiumAudioRequires: Record<string, number> = {
  'prem-paz-01': require('../../assets/audio/prem-paz-01.mp3'),
  'prem-paz-02': require('../../assets/audio/prem-paz-02.mp3'),
  'prem-paz-03': require('../../assets/audio/prem-paz-03.mp3'),
  'prem-paz-04': require('../../assets/audio/prem-paz-04.mp3'),
  'prem-paz-05': require('../../assets/audio/prem-paz-05.mp3'),
  'prem-paz-06': require('../../assets/audio/prem-paz-06.mp3'),
  'prem-paz-07': require('../../assets/audio/prem-paz-07.mp3'),
  'prem-resiliencia-01': require('../../assets/audio/prem-resiliencia-01.mp3'),
  'prem-resiliencia-02': require('../../assets/audio/prem-resiliencia-02.mp3'),
  'prem-resiliencia-03': require('../../assets/audio/prem-resiliencia-03.mp3'),
  'prem-resiliencia-04': require('../../assets/audio/prem-resiliencia-04.mp3'),
  'prem-resiliencia-05': require('../../assets/audio/prem-resiliencia-05.mp3'),
  'prem-proposito-01': require('../../assets/audio/prem-proposito-01.mp3'),
  'prem-proposito-02': require('../../assets/audio/prem-proposito-02.mp3'),
  'prem-proposito-03': require('../../assets/audio/prem-proposito-03.mp3'),
  'prem-proposito-04': require('../../assets/audio/prem-proposito-04.mp3'),
  'prem-proposito-05': require('../../assets/audio/prem-proposito-05.mp3'),
  'prem-proposito-06': require('../../assets/audio/prem-proposito-06.mp3'),
  'prem-gratidao-01': require('../../assets/audio/prem-gratidao-01.mp3'),
  'prem-gratidao-02': require('../../assets/audio/prem-gratidao-02.mp3'),
  'prem-gratidao-03': require('../../assets/audio/prem-gratidao-03.mp3'),
  'prem-gratidao-04': require('../../assets/audio/prem-gratidao-04.mp3'),
  'prem-gratidao-05': require('../../assets/audio/prem-gratidao-05.mp3'),
  'prem-descanso-01': require('../../assets/audio/prem-descanso-01.mp3'),
  'prem-descanso-02': require('../../assets/audio/prem-descanso-02.mp3'),
  'prem-descanso-03': require('../../assets/audio/prem-descanso-03.mp3'),
  'prem-descanso-04': require('../../assets/audio/prem-descanso-04.mp3'),
  'prem-descanso-05': require('../../assets/audio/prem-descanso-05.mp3'),
  'prem-descanso-06': require('../../assets/audio/prem-descanso-06.mp3'),
  'prem-descanso-07': require('../../assets/audio/prem-descanso-07.mp3'),
  'prem-preocupacao-01': require('../../assets/audio/prem-preocupacao-01.mp3'),
  'prem-preocupacao-02': require('../../assets/audio/prem-preocupacao-02.mp3'),
  'prem-preocupacao-03': require('../../assets/audio/prem-preocupacao-03.mp3'),
  'prem-preocupacao-04': require('../../assets/audio/prem-preocupacao-04.mp3'),
  'prem-preocupacao-05': require('../../assets/audio/prem-preocupacao-05.mp3'),
  'prem-preocupacao-06': require('../../assets/audio/prem-preocupacao-06.mp3'),
};

const premiumCoverRequires: Record<string, number> = {
  'prem-paz-01': require('../../assets/thumbnails/prem-paz-01.jpg'),
  'prem-paz-02': require('../../assets/thumbnails/prem-paz-02.jpg'),
  'prem-paz-03': require('../../assets/thumbnails/prem-paz-03.jpg'),
  'prem-paz-04': require('../../assets/thumbnails/prem-paz-04.jpg'),
  'prem-paz-05': require('../../assets/thumbnails/prem-paz-05.jpg'),
  'prem-paz-06': require('../../assets/thumbnails/prem-paz-06.jpg'),
  'prem-paz-07': require('../../assets/thumbnails/prem-paz-07.jpg'),
  'prem-resiliencia-01': require('../../assets/thumbnails/prem-resiliencia-01.jpg'),
  'prem-resiliencia-02': require('../../assets/thumbnails/prem-resiliencia-02.jpg'),
  'prem-resiliencia-03': require('../../assets/thumbnails/prem-resiliencia-03.jpg'),
  'prem-resiliencia-04': require('../../assets/thumbnails/prem-resiliencia-04.jpg'),
  'prem-resiliencia-05': require('../../assets/thumbnails/prem-resiliencia-05.jpg'),
  'prem-proposito-01': require('../../assets/thumbnails/prem-proposito-01.jpg'),
  'prem-proposito-02': require('../../assets/thumbnails/prem-proposito-02.jpg'),
  'prem-proposito-03': require('../../assets/thumbnails/prem-proposito-03.jpg'),
  'prem-proposito-04': require('../../assets/thumbnails/prem-proposito-04.jpg'),
  'prem-proposito-05': require('../../assets/thumbnails/prem-proposito-05.jpg'),
  'prem-proposito-06': require('../../assets/thumbnails/prem-proposito-06.jpg'),
  'prem-gratidao-01': require('../../assets/thumbnails/prem-gratidao-01.jpg'),
  'prem-gratidao-02': require('../../assets/thumbnails/prem-gratidao-02.jpg'),
  'prem-gratidao-03': require('../../assets/thumbnails/prem-gratidao-03.jpg'),
  'prem-gratidao-04': require('../../assets/thumbnails/prem-gratidao-04.jpg'),
  'prem-gratidao-05': require('../../assets/thumbnails/prem-gratidao-05.jpg'),
  'prem-descanso-01': require('../../assets/thumbnails/prem-descanso-01.jpg'),
  'prem-descanso-02': require('../../assets/thumbnails/prem-descanso-02.jpg'),
  'prem-descanso-03': require('../../assets/thumbnails/prem-descanso-03.jpg'),
  'prem-descanso-04': require('../../assets/thumbnails/prem-descanso-04.jpg'),
  'prem-descanso-05': require('../../assets/thumbnails/prem-descanso-05.jpg'),
  'prem-descanso-06': require('../../assets/thumbnails/prem-descanso-06.jpg'),
  'prem-descanso-07': require('../../assets/thumbnails/prem-descanso-07.jpg'),
  'prem-preocupacao-01': require('../../assets/thumbnails/prem-preocupacao-01.jpg'),
  'prem-preocupacao-02': require('../../assets/thumbnails/prem-preocupacao-02.jpg'),
  'prem-preocupacao-03': require('../../assets/thumbnails/prem-preocupacao-03.jpg'),
  'prem-preocupacao-04': require('../../assets/thumbnails/prem-preocupacao-04.jpg'),
  'prem-preocupacao-05': require('../../assets/thumbnails/prem-preocupacao-05.jpg'),
  'prem-preocupacao-06': require('../../assets/thumbnails/prem-preocupacao-06.jpg'),
};

const premiumAmbientBySeries: Record<string, number> = {
  paz: require('../../assets/audio/ambient/ansiedade-01.mp3'),
  resiliencia: require('../../assets/audio/ambient/medo-01.mp3'),
  proposito: require('../../assets/audio/ambient/manha-esperanca-01.mp3'),
  gratidao: require('../../assets/audio/ambient/amor-acalma-01.mp3'),
  descanso: require('../../assets/audio/ambient/noite-ansiedade-01.mp3'),
  preocupacao: require('../../assets/audio/ambient/ansiedade-01.mp3'),
};

export const premiumSeriesSessions: Session[] = Object.entries(
  premiumSeriesMeta,
).map(([id, item]) => ({
  id,
  title: item.title,
  subtitle: item.subtitle,
  summary: item.summary,
  category: 'serie' as const,
  durationSeconds: item.durationSeconds,
  audioSource: premiumAudioRequires[id],
  ambientSource: premiumAmbientBySeries[item.seriesId],
  ambientVolume: item.ambientVolume,
  biblicalPrayerId: item.biblicalPrayerIds[0],
  biblicalPrayerIds: [...item.biblicalPrayerIds],
  journeyDay: item.seriesDay,
  seriesId: item.seriesId,
  seriesTitle: item.seriesTitle,
  coverColor: item.coverColor,
  coverImage: premiumCoverRequires[id],
}));

export const premiumSeriesById = {
  paz: premiumSeriesSessions.filter((s) => s.seriesId === 'paz'),
  resiliencia: premiumSeriesSessions.filter((s) => s.seriesId === 'resiliencia'),
  proposito: premiumSeriesSessions.filter((s) => s.seriesId === 'proposito'),
  gratidao: premiumSeriesSessions.filter((s) => s.seriesId === 'gratidao'),
  descanso: premiumSeriesSessions.filter((s) => s.seriesId === 'descanso'),
  preocupacao: premiumSeriesSessions.filter((s) => s.seriesId === 'preocupacao'),
};

export const sessions: Session[] = [
  ...baseSessions,
  ...journeySessions,
  ...meditationSessions,
  ...ecosystemSessions,
  ...premiumSeriesSessions,
];

export const morningSessions = sessions.filter((s) => s.category === 'manha');
export const nightSessions = sessions.filter((s) => s.category === 'noite');
export const sosSession = sessions.find((s) => s.category === 'sos')!;

export function getSessionById(id: string) {
  return sessions.find((session) => session.id === id);
}

export function getRecommendedSessions(feeling: string | null | undefined) {
  if (feeling === 'ansioso') {
    return [
      sosSession,
      ecosystemSessions.find((s) => s.id === 'eco-ansiedade-01')!,
      meditationSessions.find((s) => s.id === 'ordem-caos-01')!,
      ...journeySessions.filter((s) =>
        ['ansiedade-01', 'ansiedade-02', 'ansiedade-03'].includes(s.id),
      ),
    ].filter(Boolean);
  }
  if (feeling === 'sobrecarregado') {
    return [
      ecosystemSessions.find((s) => s.id === 'eco-ordem-01')!,
      meditationSessions.find((s) => s.id === 'amor-acalma-01')!,
      journeySessions.find((s) => s.id === 'sobrecarga-01')!,
      journeySessions.find((s) => s.id === 'noite-ansiedade-01')!,
      ...nightSessions,
    ].filter(Boolean);
  }
  if (feeling === 'triste') {
    return [
      meditationSessions.find((s) => s.id === 'certeza-fe-01')!,
      journeySessions.find((s) => s.id === 'manha-esperanca-01')!,
      journeySessions.find((s) => s.id === 'medo-01')!,
      ...morningSessions,
    ].filter(Boolean);
  }
  return sessions;
}
