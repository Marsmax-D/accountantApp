import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

interface Option {
  key: string;
  label: string;
}

interface Props {
  options: Option[];
  selected: string;
  onSelect: (key: string) => void;
}

export function SegmentedControl({ options, selected, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={({ pressed }) => [
            styles.segment,
            { backgroundColor: selected === opt.key ? theme.text : 'transparent' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelect(opt.key)}
        >
          <ThemedText
            style={[
              styles.label,
              { color: selected === opt.key ? theme.background : theme.text },
            ]}
          >
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
