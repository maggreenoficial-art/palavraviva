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
} from '../store/useUserStore';
import { MIN_TAP, colors, radius, spacing, useTypography } from '../theme';

interface HelpFaqSheetProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'O que é o Palavra Viva?',
    a: 'Um espaço de paz com áudios de oração, meditações e leituras bíblicas. Oferece apoio espiritual e não substitui terapia ou acompanhamento médico. O app é gratuito para começar.',
  },
  {
    q: 'O que é o SOS?',
    a: 'Alívio rápido (cerca de 2 minutos) mais a sequência Paz na Ansiedade — sete áudios com Palavra e prática. Sempre gratuito, sem login.',
  },
  {
    q: 'O que posso usar de graça?',
    a: 'SOS (alívio rápido + sequência Paz na Ansiedade), leituras bíblicas em texto, a jornada dia a dia (conforme o dia liberado), o primeiro dia de cada série como amostra e as primeiras orações do Velho Testamento.',
  },
  {
    q: 'O que é a Missão+?',
    a: `Assinatura mensal opcional (${SUBSCRIPTION_PRICE_LABEL}) que libera todos os áudios e séries premium. Sem Missão+, o conteúdo gratuito continua disponível. Não há período de teste da assinatura.`,
  },
  {
    q: 'O que são as Ferramentas?',
    a: 'Hoje a aba Ferramentas oferece a Foto com Jesus: você envia uma foto, paga R$ 5,00 e, após a confirmação do pagamento, recebe uma imagem artística gerada por IA.',
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
