import { StyleSheet, View } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/utils/format';
import { type SourceBreakdown as SourceBreakdownType } from '@/types/report';

const COLORS = ['#07C160', '#FF9800'];
const LABELS: Record<string, string> = { wechat: '微信收入', manual: '线下收入' };

interface Props {
  data: SourceBreakdownType[];
  total: number;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export function SourcePieChart({ data, total }: Props) {
  if (data.length === 0) return null;

  const cx = 60;
  const cy = 60;
  const r = 50;

  let currentAngle = 0;
  const segments = data.map((item, i) => {
    const pct = total > 0 ? item.total / total : 0;
    const angle = pct * 360;
    const path = describeArc(cx, cy, r, currentAngle, currentAngle + angle);
    const midAngle = currentAngle + angle / 2;
    currentAngle += angle;
    return { path, color: COLORS[i] ?? '#999', label: LABELS[item.source] ?? item.source, total: item.total, pct, midAngle };
  });

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>收入来源</ThemedText>
      <View style={styles.content}>
        <Svg width={120} height={120}>
          {segments.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} opacity={0.85} />
          ))}
        </Svg>
        <View style={styles.legend}>
          {segments.map((s, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <ThemedText style={styles.legendLabel}>{s.label}</ThemedText>
              <ThemedText style={styles.legendValue}>
                {formatCurrency(s.total)}
              </ThemedText>
            </View>
          ))}
        </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 14,
    flex: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
