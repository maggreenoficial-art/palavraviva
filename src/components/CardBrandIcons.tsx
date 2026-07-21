import { StyleSheet, Text, View } from 'react-native';
import type { CardBrand } from '../utils/inputMasks';
import { colors, radius, spacing } from '../theme';

const BRANDS: {
  id: Exclude<CardBrand, null>;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { id: 'visa', label: 'VISA', bg: '#1A1F71', fg: '#FFFFFF' },
  { id: 'mastercard', label: 'Master', bg: '#EB001B', fg: '#FFFFFF' },
  { id: 'elo', label: 'Elo', bg: '#000000', fg: '#FFCB05' },
  { id: 'amex', label: 'Amex', bg: '#006FCF', fg: '#FFFFFF' },
  { id: 'hipercard', label: 'Hiper', bg: '#B3131B', fg: '#FFFFFF' },
];

interface CardBrandIconsProps {
  active: CardBrand;
}

export function CardBrandIcons({ active }: CardBrandIconsProps) {
  return (
    <View style={styles.row} accessibilityLabel="Bandeiras de cartão aceitas">
      {BRANDS.map((brand) => {
        const isActive = active === brand.id;
        const dimmed = Boolean(active) && !isActive;
        return (
          <View
            key={brand.id}
            style={[
              styles.badge,
              { backgroundColor: brand.bg },
              dimmed && styles.dimmed,
              isActive && styles.active,
            ]}
          >
            <Text style={[styles.label, { color: brand.fg }]}>{brand.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: 4,
    maxWidth: '100%',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.sm,
    minWidth: 48,
    alignItems: 'center',
    opacity: 0.55,
  },
  dimmed: {
    opacity: 0.25,
  },
  active: {
    opacity: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
