export { colors } from './colors';
export { typography } from './typography';
export type { TypographyStyle, TypographyToken } from './typography';
export { useTypography, scaleTypography, fontScaleFactors } from './useTypography';
export type { FontScale } from '../store/useUserStore';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40,
  screen: 20,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

/** Tamanho mínimo de alvo de toque (WCAG / guia sênior) */
export const MIN_TAP = 44;

/** Altura aproximada da tab bar + folga para listas */
export const TAB_BAR_OFFSET = 100;
