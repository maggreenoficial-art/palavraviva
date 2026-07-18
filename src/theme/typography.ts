export const typography = {
  brand: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    letterSpacing: 0.4,
    lineHeight: 34,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 19,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 26,
  },
  bodyMedium: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
  },
} as const;

export type TypographyToken = keyof typeof typography;
export type TypographyStyle = {
  fontFamily: string;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number;
};
