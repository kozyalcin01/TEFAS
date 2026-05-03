import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme';

interface BadgeProps {
  label: string;
  positive?: boolean;
  negative?: boolean;
  neutral?: boolean;
}

export function Badge({ label, positive, negative, neutral }: BadgeProps) {
  const bgColor = positive
    ? colors.positiveLight
    : negative
    ? colors.negativeLight
    : neutral
    ? 'rgba(136,146,164,0.15)'
    : colors.accentLight;

  const textColor = positive
    ? colors.positive
    : negative
    ? colors.negative
    : neutral
    ? colors.neutral
    : colors.accent;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
