import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.bg.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
});
