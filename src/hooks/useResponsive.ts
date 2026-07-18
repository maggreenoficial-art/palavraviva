import { useWindowDimensions } from 'react-native';

/** Breakpoints do webapp (PWA phone-first). */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

/**
 * Hook de responsividade para Expo / PWA.
 * Mobile: shell estreito; tablet/desktop: um pouco mais largo, ainda centrado.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;

  /** Largura máxima do shell do app na web. */
  const shellMaxWidth = isDesktop ? 720 : isTablet ? 600 : 480;

  /** Largura útil de cards horizontais (jornada, etc.). */
  const cardWidth = Math.min(width - 40, isMobile ? 280 : 320);

  const containerPadding = isMobile ? 20 : isTablet ? 24 : 32;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    shellMaxWidth,
    cardWidth,
    containerPadding,
  };
}
