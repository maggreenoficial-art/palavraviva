export type ToolStatus = 'live' | 'soon';

export type ToolId = 'foto-jesus' | 'diario';

export interface ToolCatalogItem {
  id: ToolId;
  title: string;
  benefit: string;
  priceLabel: string;
  priceValue: number;
  status: ToolStatus;
  /** Rota do app quando live */
  href?: string;
  /** Cobrança por uso (não vitalício) */
  consumable?: boolean;
}

export const TOOL_FOTO_JESUS_PRICE = 5;
export const TOOL_FOTO_JESUS_PRICE_LABEL = 'R$ 5,00';

/** Mantido para a tela /diario legada */
export const TOOL_DIARIO_PRICE = 29.9;
export const TOOL_DIARIO_PRICE_LABEL = 'R$ 29,90';
export const JOURNAL_FREE_ENTRIES = 1;

export const toolsCatalog: ToolCatalogItem[] = [
  {
    id: 'foto-jesus',
    title: 'Foto com Jesus',
    benefit:
      'Envie sua foto e receba uma imagem artística ao lado de Jesus Cristo, gerada com cuidado e respeito.',
    priceLabel: TOOL_FOTO_JESUS_PRICE_LABEL,
    priceValue: TOOL_FOTO_JESUS_PRICE,
    status: 'live',
    href: '/foto-jesus',
    consumable: true,
  },
];

export function getToolById(id: string): ToolCatalogItem | undefined {
  return toolsCatalog.find((tool) => tool.id === id);
}
