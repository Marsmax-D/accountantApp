import { useMemo } from 'react';
import { StyleSheet, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

interface Props {
  onPress: () => void;
}

const SIZE = 56;
const MARGIN = 20;

export function FloatingActionButton({ onPress }: Props) {
  const theme = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pan = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);

  const panResponder = useMemo(() => {
    const snapLeft = -(screenWidth - 2 * MARGIN - SIZE);

    // Y 轴范围：上方不超出状态栏，下方不超出 tab 栏
    const tabBarHeight = 50;
    const contentHeight = screenHeight - insets.top - tabBarHeight;
    const minTranslateY = -(contentHeight - 2 * MARGIN - SIZE);
    const maxTranslateY = MARGIN;

    const clampY = (y: number) => Math.min(maxTranslateY, Math.max(minTranslateY, y));

    let isDragging = false;
    const offset = { x: 0, y: 0 };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging = false;
        // 停止可能还在运行的动画，确保读取到正确位置
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        pan.setValue({ x: currentX, y: currentY });
        offset.x = currentX;
        offset.y = currentY;
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isDragging = true;
        }
        pan.setValue({
          x: offset.x + gs.dx,
          y: clampY(offset.y + gs.dy),
        });
      },
      onPanResponderRelease: (_, gs) => {
        const finalX = offset.x + gs.dx;
        const finalY = clampY(offset.y + gs.dy);

        if (!isDragging) {
          onPress();
          return;
        }

        const fabCenterX = screenWidth - MARGIN - SIZE / 2 + finalX;
        const targetX = fabCenterX < screenWidth / 2 ? snapLeft : 0;

        Animated.spring(pan, {
          toValue: { x: targetX, y: finalY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    });
  }, [screenWidth, screenHeight, insets.top, pan, onPress]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          backgroundColor: theme.text,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <ThemedText style={[styles.icon, { color: theme.background }]}>+</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: MARGIN,
    bottom: MARGIN,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
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
