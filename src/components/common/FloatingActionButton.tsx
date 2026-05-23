import { StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

export function FloatingActionButton({ onPress, style }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text },
        pressed && { opacity: 0.8 },
        style,
      ]}
      onPress={onPress}
    >
      <ThemedText style={[styles.icon, { color: theme.background }]}>+</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  icon: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
});
