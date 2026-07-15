/**
 * Dez orações famosas do Velho Testamento.
 * Texto bíblico: somente dataset local verificado (não inventar versículos).
 */
export interface OldTestamentPrayer {
  id: string;
  /** ID no dataset biblicalPrayerTexts.json */
  passageId: string;
  order: number;
  emoji: string;
  title: string;
  whoPrayed: string;
  focus: string;
  highlightHint: string;
  coverColor: string;
}

export const oldTestamentPrayers: OldTestamentPrayer[] = [
  {
    id: 'ot-salmo-23',
    passageId: 'salmo-23',
    order: 1,
    emoji: '👑',
    title: 'O Salmo do Pastor',
    whoPrayed: 'Rei Davi',
    focus: 'Confiança e provisão',
    highlightHint: 'O Senhor é o meu pastor…',
    coverColor: '#1F3A2E',
  },
  {
    id: 'ot-salmo-51',
    passageId: 'salmo-51',
    order: 2,
    emoji: '🛑',
    title: 'A Oração de Arrependimento',
    whoPrayed: 'Rei Davi',
    focus: 'Pedido de perdão e purificação',
    highlightHint: 'Cria em mim, ó Deus, um coração puro…',
    coverColor: '#2A2430',
  },
  {
    id: 'ot-salomao-templo',
    passageId: '1KINGS_8_22_30',
    order: 3,
    emoji: '🏛️',
    title: 'A Dedicação do Templo',
    whoPrayed: 'Rei Salomão',
    focus: 'Dedicação e clamor público',
    highlightHint: 'Ouve a oração do teu servo…',
    coverColor: '#3A2E1F',
  },
  {
    id: 'ot-ana',
    passageId: '1SAMUEL_2_1_10',
    order: 4,
    emoji: '👶',
    title: 'O Cântico de Ana',
    whoPrayed: 'Ana, mãe de Samuel',
    focus: 'Gratidão por um milagre',
    highlightHint: 'Meu coração se regozija no Senhor…',
    coverColor: '#3A2A24',
  },
  {
    id: 'ot-elias-carmelo',
    passageId: '1KINGS_18_36_39',
    order: 5,
    emoji: '🔥',
    title: 'O Desafio no Monte Carmelo',
    whoPrayed: 'Profeta Elias',
    focus: 'Manifestação do poder de Deus',
    highlightHint: 'Responde-me, Senhor, responde-me…',
    coverColor: '#2E2418',
  },
  {
    id: 'ot-jabez',
    passageId: '1CHRONICLES_4_10',
    order: 6,
    emoji: '🛡️',
    title: 'A Oração de Jabez',
    whoPrayed: 'Jabez',
    focus: 'Proteção e bênção',
    highlightHint: 'Ah, se tu me abençoares muito…',
    coverColor: '#1F2E3A',
  },
  {
    id: 'ot-daniel-9',
    passageId: 'DANIEL_9_4_19',
    order: 7,
    emoji: '🌍',
    title: 'A Intercessão por Israel',
    whoPrayed: 'Profeta Daniel',
    focus: 'Confissão e restauração',
    highlightHint: 'Ó Senhor, ouve; ó Senhor, perdoa…',
    coverColor: '#1A2438',
  },
  {
    id: 'ot-jonas',
    passageId: 'oracao-jonas',
    order: 8,
    emoji: '🌪️',
    title: 'O Clamor no Ventre do Peixe',
    whoPrayed: 'Profeta Jonas',
    focus: 'Socorro no desespero',
    highlightHint: 'A salvação vem do Senhor…',
    coverColor: '#152A36',
  },
  {
    id: 'ot-habacuque',
    passageId: 'HABAKKUK_3_17_19',
    order: 9,
    emoji: '🌾',
    title: 'A Oração da Fé na Escassez',
    whoPrayed: 'Profeta Habacuque',
    focus: 'Louvor mesmo na crise',
    highlightHint: 'Todavia eu me alegrarei no Senhor…',
    coverColor: '#2E2818',
  },
  {
    id: 'ot-moises',
    passageId: 'EXODUS_32_11_14',
    order: 10,
    emoji: '👥',
    title: 'A Intercessão de Moisés',
    whoPrayed: 'Moisés',
    focus: 'Misericórdia e perdão pelos outros',
    highlightHint: 'Moisés orou à face do Senhor…',
    coverColor: '#2A2418',
  },
];

export function getOldTestamentPrayerById(id: string) {
  return oldTestamentPrayers.find((item) => item.id === id);
}

export function getOldTestamentPrayerByPassageId(passageId: string) {
  return oldTestamentPrayers.find((item) => item.passageId === passageId);
}
