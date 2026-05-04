import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { usePortfoyDegeri } from '@/hooks/usePortfolyo';
import { colors, spacing, typography, radius } from '@/theme';
import { formatTL, formatPercent, formatAdet } from '@/utils/format';

export default function HomeScreen() {
  const {
    pozisyonlar,
    toplamMevcutTL,
    toplamGetiriTL,
    toplamGetiriYuzde,
    toplamStopajTL,
    gunlukDegisimTL,
    isLoading,
  } = usePortfoyDegeri();

  const isPositive = toplamGetiriTL >= 0;
  const gunlukPositive = gunlukDegisimTL >= 0;

  return (
    <Screen scroll padded={false}>
      {/* Hero header */}
      <View style={styles.hero}>
        <Text style={styles.heroEtiket}>Toplam Portföy Değeri</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginVertical: 16 }} />
        ) : (
          <Text style={styles.heroTutar}>{formatTL(toplamMevcutTL)}</Text>
        )}
        <View style={styles.degisimSatir}>
          <Text style={[styles.degisimTL, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : ''}{formatTL(toplamGetiriTL)}
          </Text>
          <View style={[styles.degisimBadge, { backgroundColor: isPositive ? colors.positiveLight : colors.negativeLight }]}>
            <Text style={[styles.degisimYuzde, { color: isPositive ? colors.positive : colors.negative }]}>
              {formatPercent(toplamGetiriYuzde)}
            </Text>
          </View>
        </View>
        <Text style={[styles.gunluk, { color: gunlukPositive ? colors.positive : colors.negative }]}>
          Bugün {gunlukPositive ? '+' : ''}{formatTL(gunlukDegisimTL)}
        </Text>
        {!isLoading && toplamStopajTL > 0 && (
          <View style={styles.stopajSatir}>
            <Text style={styles.stopajEtiket}>Bugün satılsa stopaj (%10)</Text>
            <Text style={styles.stopajTutar}>−{formatTL(toplamStopajTL)}</Text>
          </View>
        )}
      </View>

      {/* Fon listesi */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Pozisyonlar</Text>
        {pozisyonlar.length === 0 && !isLoading ? (
          <View style={styles.bosKutu}>
            <Text style={styles.bosText}>Portföyünüz boş.</Text>
            <Text style={styles.bosAlt}>İşlemler sekmesinden fon ekleyin.</Text>
          </View>
        ) : (
          <View style={styles.listek}>
            {pozisyonlar.map((poz) => {
              const getiriPos = (poz.getiriYuzde ?? 0) >= 0;
              return (
                <Card
                  key={poz.fon_kodu}
                  onPress={() => router.push(`/fund/${poz.fon_kodu}`)}
                  style={styles.fonKarti}
                >
                  <View style={styles.fonSatir1}>
                    <View style={styles.fonSol}>
                      <View style={styles.kodBadge}>
                        <Text style={styles.kodText}>{poz.fon_kodu}</Text>
                      </View>
                      <View>
                        <Text style={styles.fonAdi} numberOfLines={1}>{poz.fon_adi || poz.fon_kodu}</Text>
                        <Text style={styles.fonAdet}>{formatAdet(poz.toplam_adet)} pay</Text>
                      </View>
                    </View>
                    <View style={styles.fonSag}>
                      <Text style={styles.fonDeger}>
                        {poz.mevcutDegerTL != null ? formatTL(poz.mevcutDegerTL) : '—'}
                      </Text>
                      {poz.getiriYuzde != null && (
                        <Badge
                          label={formatPercent(poz.getiriYuzde)}
                          positive={getiriPos}
                          negative={!getiriPos}
                        />
                      )}
                    </View>
                  </View>
                  {poz.para_birimi !== 'TRY' && (
                    <Text style={styles.pbEtiket}>{poz.para_birimi} cinsinden fon</Text>
                  )}
                  {poz.stopajTL != null && poz.stopajTL > 0 && (
                    <View style={styles.fonStopajSatir}>
                      <Text style={styles.fonStopajEtiket}>Stopaj</Text>
                      <Text style={styles.fonStopajTutar}>−{formatTL(poz.stopajTL)}</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  heroEtiket: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 1 },
  heroTutar: { ...typography.hero, marginVertical: spacing.sm },
  degisimSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  degisimTL: { fontSize: 18, fontWeight: '600' },
  degisimBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  degisimYuzde: { fontSize: 14, fontWeight: '700' },
  gunluk: { ...typography.caption, marginTop: spacing.xs },
  bolum: { paddingHorizontal: spacing.md },
  bolumBaslik: { ...typography.h2, marginBottom: spacing.md },
  listek: { gap: spacing.sm, paddingBottom: spacing.xl },
  fonKarti: { gap: spacing.sm },
  fonSatir1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fonSol: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  fonSag: { alignItems: 'flex-end', gap: 4 },
  kodBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  kodText: { ...typography.badge, color: colors.accent },
  fonAdi: { ...typography.subtitle, fontSize: 14, maxWidth: 180 },
  fonAdet: { ...typography.caption, fontSize: 11 },
  fonDeger: { ...typography.subtitle },
  pbEtiket: { ...typography.caption, fontSize: 11, color: colors.text.tertiary },
  bosKutu: { alignItems: 'center', marginTop: 60 },
  bosText: typography.subtitle,
  bosAlt: { ...typography.body, marginTop: spacing.xs },
  stopajSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.bg.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopajEtiket: { ...typography.caption, fontSize: 11, color: colors.text.secondary },
  stopajTutar: { ...typography.caption, fontSize: 12, fontWeight: '600', color: colors.negative },
  fonStopajSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fonStopajEtiket: { ...typography.caption, fontSize: 11, color: colors.text.tertiary },
  fonStopajTutar: { ...typography.caption, fontSize: 11, fontWeight: '600', color: colors.negative },
});
