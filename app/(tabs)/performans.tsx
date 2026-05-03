import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { useAcikPozisyonlar } from '@/hooks/usePortfolyo';
import { tefasService } from '@/services/tefasService';
import { colors, spacing, typography, radius } from '@/theme';
import { formatPercent, formatTL } from '@/utils/format';
import type { Periyod } from '@/types';

const PERIYODLAR: { key: Periyod; label: string }[] = [
  { key: 'hafta', label: '1H' },
  { key: '1ay',   label: '1A' },
  { key: '3ay',   label: '3A' },
  { key: '6ay',   label: '6A' },
  { key: '1yil',  label: '1Y' },
  { key: '3yil',  label: '3Y' },
  { key: '5yil',  label: '5Y' },
];

const GUN_SAYILARI: Record<Periyod, number> = {
  hafta: 7, '1ay': 30, '3ay': 90, '6ay': 180, '1yil': 365, '3yil': 1095, '5yil': 1825,
};

// Türkiye vadeli mevduat faizi (yıllık) — benchmark olarak kullanılır
const YILLIK_MEVDUAT_FAIZI = 0.40; // %40

function benchmarkHesapla(periyod: Periyod): number {
  // Yıllık faizi döneme oranla
  const gun = GUN_SAYILARI[periyod];
  return YILLIK_MEVDUAT_FAIZI * (gun / 365);
}

export default function PerformansScreen() {
  const [seciliPeriyod, setSeciliPeriyod] = useState<Periyod>('1ay');
  const { data: pozisyonlar = [] } = useAcikPozisyonlar();

  const getiriSorguları = useQueries({
    queries: pozisyonlar.map((poz) => ({
      queryKey: ['donemsel-getiri', poz.fon_kodu],
      queryFn: () => tefasService.getDonemselGetiri(poz.fon_kodu),
      staleTime: 60 * 60 * 1000,
    })),
  });

  const isLoading = getiriSorguları.some((q) => q.isLoading);

  const toplamMaliyetTL = pozisyonlar.reduce((s, p) => s + p.toplam_maliyet_tl, 0);

  const getirilerHesapli = pozisyonlar.map((poz, i) => {
    const getiriler = getiriSorguları[i]?.data?.getiriler;
    const donemGetiri = getiriler?.[seciliPeriyod] ?? null;
    const agirlik = toplamMaliyetTL > 0 ? poz.toplam_maliyet_tl / toplamMaliyetTL : 0;
    return { ...poz, donemGetiri, agirlik };
  });

  const portfoyGetiri = getirilerHesapli.reduce((s, p) => {
    if (p.donemGetiri == null) return s;
    return s + p.agirlik * p.donemGetiri;
  }, 0);

  const benchmarkGetiri = benchmarkHesapla(seciliPeriyod);
  const alpha = portfoyGetiri - benchmarkGetiri;

  const isPositive = portfoyGetiri >= 0;
  const alphaPos = alpha >= 0;

  return (
    <Screen scroll>
      <Text style={typography.title}>Performans</Text>

      {/* Periyod seçici */}
      <View style={styles.periyodRow}>
        {PERIYODLAR.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.periyodBtn, seciliPeriyod === key && styles.periyodSecili]}
            onPress={() => setSeciliPeriyod(key)}
          >
            <Text style={[styles.periyodText, seciliPeriyod === key && styles.periyodTextSecili]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Özet kartı */}
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
      ) : (
        <Card style={styles.ozetKart}>
          <Text style={styles.ozetBaslik}>Portföy Getirisi</Text>
          <Text style={[styles.ozetGetiri, { color: isPositive ? colors.positive : colors.negative }]}>
            {formatPercent(portfoyGetiri)}
          </Text>
          <View style={styles.benchmarkSatir}>
            <View style={styles.benchmarkKalem}>
              <Text style={styles.benchmarkEtiket}>Vadeli Mevduat Eşd. (Yıllık)</Text>
              <Text style={styles.benchmarkDeger}>{formatPercent(benchmarkGetiri)}</Text>
            </View>
            <View style={styles.benchmarkKalem}>
              <Text style={styles.benchmarkEtiket}>Alpha</Text>
              <Text style={[styles.benchmarkDeger, { color: alphaPos ? colors.positive : colors.negative }]}>
                {formatPercent(alpha)}
              </Text>
            </View>
          </View>
          <Text style={styles.benchmarkAciklama}>
            * Benchmark: %40 yıllık vadeli mevduat faizinin {GUN_SAYILARI[seciliPeriyod]} günlük karşılığı (%{(benchmarkGetiri * 100).toFixed(2)}). Alpha = Portföy getirisi − Benchmark.
          </Text>
        </Card>
      )}

      {/* Fon bazlı tablo */}
      <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
        Fon Bazında Getiriler
      </Text>
      <View style={styles.tablo}>
        {/* Başlık */}
        <View style={[styles.satirr, styles.satirBaslik]}>
          <Text style={[styles.tabloHucre, { flex: 2 }]}>Fon</Text>
          <Text style={[styles.tabloHucre, styles.sag]}>Ağırlık</Text>
          <Text style={[styles.tabloHucre, styles.sag]}>Getiri</Text>
          <Text style={[styles.tabloHucre, styles.sag]}>Maliyet</Text>
        </View>
        {getirilerHesapli.map((poz) => {
          const gPos = (poz.donemGetiri ?? 0) >= 0;
          return (
            <View key={poz.fon_kodu} style={styles.satirr}>
              <View style={{ flex: 2 }}>
                <Text style={styles.fonKodText}>{poz.fon_kodu}</Text>
                <Text style={styles.fonAdiText} numberOfLines={1}>{poz.fon_adi}</Text>
              </View>
              <Text style={[styles.tabloHucre, styles.sag]}>
                {(poz.agirlik * 100).toFixed(1)}%
              </Text>
              <Text style={[styles.tabloHucre, styles.sag, { color: gPos ? colors.positive : colors.negative }]}>
                {poz.donemGetiri != null ? formatPercent(poz.donemGetiri) : '—'}
              </Text>
              <Text style={[styles.tabloHucre, styles.sag]}>
                {formatTL(poz.toplam_maliyet_tl)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Boş state */}
      {pozisyonlar.length === 0 && (
        <View style={styles.bos}>
          <Text style={typography.subtitle}>Portföy boş</Text>
          <Text style={typography.body}>İşlem ekledikten sonra performansı görüntüleyebilirsiniz.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periyodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  periyodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periyodSecili: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  periyodText: { ...typography.caption, color: colors.text.secondary },
  periyodTextSecili: { color: colors.accent, fontWeight: '700' },
  ozetKart: { gap: spacing.sm, marginBottom: spacing.md },
  ozetBaslik: typography.caption,
  ozetGetiri: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  benchmarkSatir: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  benchmarkKalem: { gap: 2 },
  benchmarkEtiket: { ...typography.caption, fontSize: 11 },
  benchmarkDeger: { ...typography.subtitle, fontSize: 15 },
  benchmarkAciklama: { ...typography.caption, fontSize: 10, color: colors.text.tertiary, marginTop: spacing.xs },
  tablo: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  satirr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  satirBaslik: { backgroundColor: colors.bg.tertiary },
  tabloHucre: { ...typography.caption, flex: 1 },
  sag: { textAlign: 'right' },
  fonKodText: { ...typography.badge, color: colors.accent, letterSpacing: 0.5 },
  fonAdiText: { ...typography.caption, fontSize: 11 },
  bos: { alignItems: 'center', gap: spacing.sm, marginTop: 60 },
});
