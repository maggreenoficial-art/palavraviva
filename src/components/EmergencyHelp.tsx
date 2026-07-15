import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export function EmergencyHelp() {
  const [open, setOpen] = useState(false);

  async function callNumber(tel: string) {
    const url = `tel:${tel}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preciso de ajuda agora"
        accessibilityHint="Abre contatos de emergência CVV e SAMU"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>
          {open ? 'Ocultar ajuda imediata' : 'Preciso de ajuda agora'}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <Text style={styles.body}>
            Se você estiver em risco imediato ou pensando em se machucar, procure
            ajuda agora. Ligue para o CVV pelo número 188, para o SAMU pelo número
            192 ou vá ao serviço de emergência mais próximo.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ligar para o CVV, número 188"
            onPress={() => callNumber('188')}
            style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          >
            <Text style={styles.callText}>Ligar para o CVV — 188</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ligar para o SAMU, número 192"
            onPress={() => callNumber('192')}
            style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
          >
            <Text style={styles.callText}>Ligar para o SAMU — 192</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  trigger: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(240, 113, 103, 0.45)',
    backgroundColor: colors.sosSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  triggerText: {
    ...typography.bodyMedium,
    color: colors.sos,
    textAlign: 'center',
  },
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.md,
    gap: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  callButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  callText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.88,
  },
});
