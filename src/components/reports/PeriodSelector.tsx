import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type ReportType } from '@/types/report';

interface Props {
  reportType: ReportType;
  periodLabel: string;
  onTypeChange: (type: ReportType) => void;
  onPrev: () => void;
  onNext: () => void;
  hasNext?: boolean;
}

const TYPES: { key: ReportType; label: string }[] = [
  { key: 'monthly', label: '月报' },
  { key: 'quarterly', label: '季报' },
  { key: 'yearly', label: '年报' },
];

export function PeriodSelector({ reportType, periodLabel, onTypeChange, onPrev, onNext, hasNext }: Props) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.segmentRow}>
        {TYPES.map((t) => (
          <Pressable
            key={t.key}
            style={({ pressed }) => [
              styles.segment,
              { backgroundColor: reportType === t.key ? theme.text : 'transparent' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onTypeChange(t.key)}
          >
            <ThemedText
              style={[
                styles.segmentLabel,
                { color: reportType === t.key ? theme.background : theme.text },
              ]}
            >
              {t.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={onPrev} style={styles.navButton}>
          <ThemedText style={styles.navArrow}>‹</ThemedText>
        </Pressable>
        <ThemedText style={styles.periodLabel}>{periodLabel}</ThemedText>
        <Pressable
          onPress={onNext}
          style={[styles.navButton, !hasNext && styles.navDisabled]}
        >
          <ThemedText style={[styles.navArrow, !hasNext && { opacity: 0.3 }]}>›</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
});
