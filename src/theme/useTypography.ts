import { useMemo } from 'react';
import { useUserStore, type FontScale } from '../store/useUserStore';
import { typography, type TypographyStyle, type TypographyToken } from './typography';

export const fontScaleFactors: Record<FontScale, number> = {
  padrao: 1,
  medio: 1.12,
  grande: 1.24,
};

function scaleSize(value: number | undefined, factor: number) {
  if (value == null) return undefined;
  return Math.round(value * factor);
}

export function scaleTypography(factor: number): Record<TypographyToken, TypographyStyle> {
  const out = {} as Record<TypographyToken, TypographyStyle>;
  for (const key of Object.keys(typography) as TypographyToken[]) {
    const base = typography[key] as TypographyStyle;
    out[key] = {
      fontFamily: base.fontFamily,
      fontSize: scaleSize(base.fontSize, factor)!,
      letterSpacing: base.letterSpacing,
      lineHeight: scaleSize(
        base.lineHeight ?? Math.round(base.fontSize * 1.5),
        factor,
      ),
    };
  }
  return out;
}

/** Tipografia já escalada conforme preferência do usuário. */
export function useTypography() {
  const fontScale = useUserStore((s) => s.fontScale);
  return useMemo(
    () => scaleTypography(fontScaleFactors[fontScale] ?? 1),
    [fontScale],
  );
}
