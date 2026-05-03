import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ children, scroll = false, padded = true }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={padded ? styles.padded : undefined}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  padded: { padding: 16 },
});
