import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/utils/format';
import { useTheme } from '@/hooks/use-theme';
import { type ChannelBreakdown } from '@/types/report';

interface Props {
  data: ChannelBreakdown[];
  total: number;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  online: { label: '线上收入', icon: '📱', color: '#2196F3' },
  offline: { label: '线下收入', icon: '💵', color: '#FF9800' },
};

export function IncomeByChannel({ data, total }: Props) {
  const theme = useTheme();
  if (data.length === 0) return null;

  const online = data.find((d) => d.channel === 'online');
  const offline = data.find((d) => d.channel === 'offline');
  const singleMode = !online || !offline;

  function renderChannel(item: ChannelBreakdown | undefined) {
    if (!item) return null;
    const config = CHANNEL_CONFIG[item.channel];
    const pct = total > 0 ? (item.total / total) * 100 : 0;
    const style = singleMode ? styles.channelFull : styles.channelHalf;

    return (
      <View
        key={item.channel}
        style={[
          style,
          styles.channelBox,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <View style={styles.channelHeader}>
          <ThemedText style={styles.channelIcon}>{config.icon}</ThemedText>
          <ThemedText style={styles.channelLabel}>{config.label}</ThemedText>
          <ThemedText style={[styles.channelPct, { color: config.color }]}>
            {pct.toFixed(0)}%
          </ThemedText>
        </View>
        <ThemedText style={styles.channelAmount}>
          {formatCurrency(item.total)}
        </ThemedText>
        <ThemedText style={styles.channelCount}>共 {item.count} 笔</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>收入渠道</ThemedText>
      <View style={styles.row}>
        {renderChannel(online)}
        {renderChannel(offline)}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  channelHalf: {
    flex: 1,
  },
  channelFull: {
    flex: 1,
  },
  channelBox: {
    borderRadius: 12,
    padding: 14,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  channelLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  channelPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  channelAmount: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  channelCount: {
    fontSize: 12,
    opacity: 0.5,
  },
});
