import type { AccessKind } from '../store/useUserStore';
import type { ToolId } from '../constants/toolsCatalog';

/** Missão+ ou compra da ferramenta libera o uso completo. */
export function canUseTool(
  toolId: ToolId,
  accessKind: AccessKind,
  unlockedTools: string[],
): boolean {
  if (accessKind === 'subscribed') return true;
  return unlockedTools.includes(toolId);
}
