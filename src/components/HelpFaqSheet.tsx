import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SUBSCRIPTION_PRICE_LABEL,
  TRIAL_HOURS,
} from '../store/useUserStore';
import { MIN_TAP, colors, radius, spacing, useTypography } from '../theme';

interface HelpFaqSheetProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'O que é o Palavra Viva?',
    a: 'Um espaço de paz com áudios de oração, meditações e leituras bíblicas. Oferece apoio espiritual e não substitui terapia ou acompanhamento médico.',
  },
  {
    q: 'O que é o SOS?',
    a: 'Um áudio curto de alívio imediato, sempre gratuito. Use quando precisar de uma pausa com a Palavra, sem login e sem pagamento.',
  },
  {
    q: 'O que posso usar de graça?',
    a: 'SOS, leituras bíblicas em texto, a jornada dia a dia (conforme o dia liberado) e o primeiro dia de cada série como amostra.',
  },
  {
    q: 'O que é a Missão+?',
    a: `Assinatura mensal (${SUBSCRIPTION_PRICE_LABEL}) que libera todos os áudios, séries premium, a jornada completa e as ferramentas utilitárias (como o Diário).`,
  },
  {
    q: 'O que são as Ferramentas?',
    a: 'Na aba Ferramentas você encontra recursos práticos. O Diário de Gratidão já está disponível (primeira entrada grátis; depois compra única ou Missão+). Outras ferramentas chegam em breve.',
  },
  {
    q: `O que é o período gratuito de ${TRIAL_HOURS} horas?`,
    a: `Ao criar seu perfil, você tem cerca de ${TRIAL_HOURS} horas com acesso amplo aos áudios. Depois, o conteúdo premium pede a Missão+.`,
  },
  {
    q: 'E em uma emergência?',
    a: 'Se você estiver em perigo ou crise, procure ajuda imediata: CVV 188 (24h) ou SAMU 192. O app não substitui atendimento de emergência.',
  },
  {
    q: 'E a minha privacidade?',
    a: 'Seus dados ficam neste aparelho. Em Configurações você pode apagar o sentimento salvo, check-ins e as entradas do diário.',
  },
] as const;

export function HelpFaqSheet({ visible, onClose }: HelpFaqSheetProps) {
  const type = useTypography();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.overlay,
        },
        sheet: {
          maxHeight: '88%',
          backgroundColor: colors.backgroundElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          borderTopWidth: 1,
          borderColor: colors.border,
        },
        handle: {
          alignSelf: 'center',
          width: 42,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: spacing.lg,
        },
        title: {
          ...type.title,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        subtitle: {
          ...type.caption,
          color: colors.textSecondary,
          marginBottom: spacing.lg,
        },
        item: {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        question: {
          minHeight: MIN_TAP + 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingVertical: spacing.md,
        },
        questionText: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          flex: 1,
        },
        chevron: {
          ...type.body,
          color: colors.accent,
          fontSize: 20,
        },
        answer: {
          ...type.body,
          color: colors.textSecondary,
          paddingBottom: spacing.lg,
        },
        close: {
          minHeight: MIN_TAP,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.lg,
        },
        closeText: {
          ...type.bodyMedium,
          color: colors.textMuted,
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          accessibilityLabel="Ajuda e perguntas frequentes"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Ajuda</Text>
          <Text style={styles.subtitle}>
            Respostas simples sobre o app, o SOS e a Missão+.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {FAQ_ITEMS.map((item, index) => {
              const open = openIndex === index;
              return (
                <View key={item.q} style={styles.item}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={item.q}
                    onPress={() => setOpenIndex(open ? null : index)}
                    style={({ pressed }) => [
                      styles.question,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.questionText}>{item.q}</Text>
                    <Text style={styles.chevron}>{open ? '−' : '+'}</Text>
                  </Pressable>
                  {open ? <Text style={styles.answer}>{item.a}</Text> : null}
                </View>
              );
            })}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar ajuda"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
