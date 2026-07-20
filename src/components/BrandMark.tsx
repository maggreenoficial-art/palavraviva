import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

const iconSource = require('../../assets/brand/icon.png');
/** Logo com fundo branco — melhor nitidez no app/web */
const logoSource = require('../../assets/brand/logo-fundobranco.png');

type BrandMarkProps = {
  /** ícone quadrado | logo horizontal (ícone + texto) */
  variant?: 'icon' | 'logo' | 'wordmark';
  /** Altura da marca (a largura acompanha a proporção) */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const LOGO_ASPECT = 888 / 281;

/** Marca Palavra Viva — ícone ou logo horizontal. */
export function BrandMark({
  variant = 'wordmark',
  size = 36,
  style,
}: BrandMarkProps) {
  if (variant === 'icon') {
    return (
      <Image
        source={iconSource}
        style={[styles.icon, { width: size, height: size, borderRadius: size * 0.22 }]}
        accessibilityLabel="Palavra Viva"
        resizeMode="cover"
      />
    );
  }

  const height = size;
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <View style={[styles.wrap, style]} accessibilityRole="header" accessibilityLabel="Palavra Viva">
      <Image
        source={logoSource}
        style={{ width, height, borderRadius: Math.min(8, height * 0.12) }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  icon: {
    backgroundColor: colors.background,
  },
});
