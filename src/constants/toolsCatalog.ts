export type ToolStatus = 'live' | 'soon';

export type ToolId =
  | 'diario'
  | 'plano-oracao'
  | 'desafios'
  | 'biblioteca'
  | 'meditacao';

export interface ToolCatalogItem {
  id: ToolId;
  title: string;
  benefit: string;
  priceLabel: string;
  priceValue: number;
  status: ToolStatus;
  /** Rota do app quando live */
  href?: string;
}

export const TOOL_DIARIO_PRICE = 29.9;
export const TOOL_DIARIO_PRICE_LABEL = 'R$ 29,90';
/** Entradas gratuitas antes do paywall */
export const JOURNAL_FREE_ENTRIES = 1;

export const toolsCatalog: ToolCatalogItem[] = [
  {
    id: 'diario',
    title: 'Diário de Gratidão',
    benefit:
      'Cultive a gratidão e acompanhe seu humor com prompts diários guiados pela Palavra.',
    priceLabel: TOOL_DIARIO_PRICE_LABEL,
    priceValue: TOOL_DIARIO_PRICE,
    status: 'live',
    href: '/diario',
  },
  {
    id: 'plano-oracao',
    title: 'Plano de Oração',
    benefit:
      'Organize pedidos por família, saúde e trabalho, com lembretes para orar com constância.',
    priceLabel: 'R$ 39,90',
    priceValue: 39.9,
    status: 'soon',
  },
  {
    id: 'desafios',
    title: 'Desafios de Fé',
    benefit:
      'Percursos de 7, 14 ou 30 dias com áudios, leituras e tarefas práticas.',
    priceLabel: 'R$ 39,90',
    priceValue: 39.9,
    status: 'soon',
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca de Versículos',
    benefit:
      'Salve coleções temáticas e compartilhe cartões com a Palavra.',
    priceLabel: 'R$ 29,90',
    priceValue: 29.9,
    status: 'soon',
  },
  {
    id: 'meditacao',
    title: 'Meditação Personalizável',
    benefit:
      'Escolha duração, tema e som de fundo para uma pausa sob medida.',
    priceLabel: 'R$ 39,90',
    priceValue: 39.9,
    status: 'soon',
  },
];

export function getToolById(id: string): ToolCatalogItem | undefined {
  return toolsCatalog.find((tool) => tool.id === id);
}
