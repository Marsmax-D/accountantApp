import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCurrency } from '@/utils/format';
import { Colors } from '@/constants/theme';

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function IncomeBarChart({ data, title, height = 180 }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(8, Math.min(28, (300 - 40) / data.length - 4));
  const chartWidth = Math.max(300, data.length * (barWidth + 6) + 40);

  return (
    <ThemedView style={styles.card}>
      {title && <ThemedText style={styles.title}>{title}</ThemedText>}
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={height}>
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <G key={i}>
              <Line
                x1={30}
                y1={height - 20 - (height - 30) * ratio}
                x2={chartWidth - 10}
                y2={height - 20 - (height - 30) * ratio}
                stroke={colors.backgroundElement}
                strokeWidth={1}
              />
              <SvgText
                x={25}
                y={height - 18 - (height - 30) * ratio}
                fontSize={9}
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {formatCurrency(maxValue * ratio)}
              </SvgText>
            </G>
          ))}
          {data.map((d, i) => {
            const barH = (d.value / maxValue) * (height - 35);
            const x = 36 + i * (barWidth + 6);
            const y = height - 22 - barH;
            return (
              <G key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill="#4CAF50"
                  opacity={0.8}
                />
                {(data.length <= 15 || i % 3 === 0) && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={height - 6}
                    fontSize={8}
                    fill={colors.textSecondary}
                    textAnchor="middle"
                  >
                    {d.label}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
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
  chartWrapper: {
    overflow: 'scroll',
  },
});
