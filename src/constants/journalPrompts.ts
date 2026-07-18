export interface JournalPrompt {
  id: string;
  text: string;
  /** ID opcional do catálogo bíblico */
  biblicalPrayerId?: string;
}

/** Prompts rotativos (psicologia positiva + fé). */
export const journalPrompts: JournalPrompt[] = [
  {
    id: 'gratidao-hoje',
    text: 'Pelo que você é grato hoje — mesmo que seja algo pequeno?',
    biblicalPrayerId: '1tessalonicenses-5-16-18',
  },
  {
    id: 'palavra-ansiedade',
    text: 'Como a Palavra de hoje te ajudou (ou pode ajudar) a lidar com a ansiedade?',
    biblicalPrayerId: 'PHILIPPIANS_4_6_7',
  },
  {
    id: 'presenca',
    text: 'Em que momento de hoje você sentiu (ou deseja sentir) a presença de Deus?',
    biblicalPrayerId: 'salmo-46-10',
  },
  {
    id: 'cuidado',
    text: 'Quem ou o que merece um gesto de cuidado seu nesta semana?',
    biblicalPrayerId: 'colossenses-3-12-14',
  },
  {
    id: 'forca',
    text: 'Onde você precisou de força — e onde viu sustentação?',
    biblicalPrayerId: 'ISAIAH_41_10',
  },
  {
    id: 'descanso',
    text: 'O que você pode entregar a Deus para descansar um pouco mais?',
    biblicalPrayerId: 'MATTHEW_11_28_30',
  },
  {
    id: 'louvor',
    text: 'Escreva um breve louvor: o que você quer agradecer a Deus agora?',
    biblicalPrayerId: 'salmo-103-1-13',
  },
];

export function promptForDate(date = new Date()): JournalPrompt {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return journalPrompts[dayOfYear % journalPrompts.length];
}
