import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { useAcikPozisyonlar, usePortfoyDegeri } from '@/hooks/usePortfolyo';
import { tefasService } from '@/services/tefasService';
import { colors, spacing, typography, radius } from '@/theme';
import { formatTL, formatPercent } from '@/utils/format';
import type { StresVarlikSinifi } from '@/types';

interface KonsolideKalem {
  kategori: string;
  degerTL: number;
  oran: number;
}

export default function VarliklarScreen() {
  const { data: pozisyonlar = [] } = useAcikPozisyonlar();
  const { pozisyonlar: pozHesapli, toplamMevcutTL, isLoading: fiyatYukleniyor } = usePortfoyDegeri();

  const portfoySorguları = useQueries({
    queries: pozisyonlar.map((poz) => ({
      queryKey: ['fon-portfoy', poz.fon_kodu],
      queryFn: () => tefasService.getFonPortfoy(poz.fon_kodu),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });

  const isLoading = portfoySorguları.some((q) => q.isLoading) || fiyatYukleniyor;
  const herhangiVeri = portfoySorguları.some((q) => q.data && q.data.length > 0);

  // Konsolide varlık tablosu oluştur
  const konsolideMap: Record<string, number> = {};

  pozisyonlar.forEach((poz, i) => {
    const dagilim = portfoySorguları[i]?.data ?? [];
    const fon = pozHesapli.find((p) => p.fon_kodu === poz.fon_kodu);
    const fonDegerTL = fon?.mevcutDegerTL ?? poz.toplam_maliyet_tl;

    dagilim.forEach((kalem) => {
      const cat = kalem.kategori || 'Diğer';
      konsolideMap[cat] = (konsolideMap[cat] ?? 0) + fonDegerTL * kalem.oran;
    });
  });

  const konsolideListe: KonsolideKalem[] = Object.entries(konsolideMap)
    .map(([kategori, degerTL]) => ({
      kategori,
      degerTL,
      oran: toplamMevcutTL > 0 ? degerTL / toplamMevcutTL : 0,
    }))
    .sort((a, b) => b.degerTL - a.degerTL);

  return (
    <Screen scroll>
      <Text style={typography.title}>Varlık Dağılımı</Text>
      <Text style={[typography.body, { marginBottom: spacing.lg }]}>
        Tüm fonlarınızdaki varlıkların konsolide dağılımı
      </Text>

      {isLoading && (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
      )}

      {!isLoading && !herhangiVeri && pozisyonlar.length > 0 && (
        <Card style={styles.uyariKutu}>
          <Text style={styles.uyariIkon}>⚠️</Text>
          <Text style={styles.uyariBaslik}>Portföy verisi alınamadı</Text>
          <Text style={styles.uyariAciklama}>
            TEFAS'tan fon portföy dağılımı çekilemedi. Bağlantı kontrol ediniz veya daha sonra tekrar deneyin.
          </Text>
        </Card>
      )}

      {!isLoading && konsolideListe.length > 0 && (
        <>
          {/* Donut benzeri bar chart */}
          <Card style={styles.dagilimKart}>
            <Text style={styles.kartBaslik}>Varlık Sınıfı Dağılımı</Text>
            <View style={styles.barContainer}>
              {konsolideListe.map((kalem, i) => (
                <View
                  key={kalem.kategori}
                  style={[
                    styles.barSegment,
                    {
                      flex: kalem.oran,
                      backgroundColor: colors.chart[i % colors.chart.length],
                    },
                  ]}
                />
              ))}
            </View>
          </Card>

          {/* Detay tablosu */}
          <View style={styles.tablo}>
            <View style={[styles.satirr, styles.satirBaslik]}>
              <Text style={[styles.hucre, { flex: 3 }]}>Varlık Sınıfı</Text>
              <Text style={[styles.hucre, styles.sag]}>Değer</Text>
              <Text style={[styles.hucre, styles.sag]}>Oran</Text>
            </View>
            {konsolideListe.map((kalem, i) => (
              <View key={kalem.kategori} style={styles.satirr}>
                <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={[styles.renkNokta, { backgroundColor: colors.chart[i % colors.chart.length] }]}
                  />
                  <Text style={styles.kategoriText}>{kalem.kategori}</Text>
                </View>
                <Text style={[styles.hucre, styles.sag]}>{formatTL(kalem.degerTL)}</Text>
                <Text style={[styles.hucre, styles.sag, { color: colors.text.primary }]}>
                  {(kalem.oran * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
            {/* Toplam satırı */}
            <View style={[styles.satirr, styles.satirToplamView]}>
              <Text style={[styles.hucre, { flex: 3, fontWeight: '700', color: colors.text.primary }]}>
                Toplam
              </Text>
              <Text style={[styles.hucre, styles.sag, styles.toplamText]}>
                {formatTL(toplamMevcutTL)}
              </Text>
              <Text style={[styles.hucre, styles.sag, styles.toplamText]}>%100</Text>
            </View>
          </View>

          {/* Fon bazlı kaynak */}
          <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
            Fon Bazında Dağılım
          </Text>
          <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
            {pozisyonlar.map((poz, i) => {
              const dagilim = portfoySorguları[i]?.data ?? [];
              const fon = pozHesapli.find((p) => p.fon_kodu === poz.fon_kodu);
              const fonDeger = fon?.mevcutDegerTL ?? poz.toplam_maliyet_tl;
              return (
                <Card key={poz.fon_kodu}>
                  <Text style={styles.fonKodBadge}>{poz.fon_kodu}</Text>
                  <Text style={styles.fonAdiText} numberOfLines={1}>{poz.fon_adi}</Text>
                  <Text style={styles.fonDegerText}>{formatTL(fonDeger)}</Text>
                  {dagilim.length === 0 ? (
                    <Text style={styles.veriYok}>Portföy verisi mevcut değil</Text>
                  ) : (
                    <View style={{ marginTop: spacing.sm, gap: 4 }}>
                      {dagilim.map((k) => (
                        <View key={k.kategori} style={styles.dagilimSatir}>
                          <Text style={styles.dagilimKat}>{k.kategori}</Text>
                          <Text style={styles.dagilimOran}>{(k.oran * 100).toFixed(1)}%</Text>
                          <Text style={styles.dagilimDeger}>{formatTL(fonDeger * k.oran)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        </>
      )}

      {pozisyonlar.length === 0 && (
        <View style={styles.bos}>
          <Text style={typography.subtitle}>Portföy boş</Text>
          <Text style={typography.body}>Fon ekleyince varlık dağılımı burada görünür.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dagilimKart: { marginBottom: spacing.md },
  kartBaslik: { ...typography.caption, marginBottom: spacing.md, textTransform: 'uppercase' },
  barContainer: {
    flexDirection: 'row',
    height: 20,
    borderRadius: radius.full,
    overflow: 'hidden',
    gap: 2,
  },
  barSegment: { borderRadius: 2 },
  tablo: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
  satirToplamView: { backgroundColor: colors.bg.tertiary },
  hucre: { ...typography.caption, flex: 1 },
  sag: { textAlign: 'right' },
  toplamText: { fontWeight: '700', color: colors.text.primary },
  renkNokta: { width: 10, height: 10, borderRadius: 5 },
  kategoriText: { ...typography.body, color: colors.text.primary, fontSize: 13 },
  fonKodBadge: { ...typography.badge, color: colors.accent, marginBottom: 2 },
  fonAdiText: { ...typography.body, fontSize: 13, marginBottom: 2 },
  fonDegerText: { ...typography.subtitle, marginBottom: spacing.xs },
  veriYok: { ...typography.caption, color: colors.text.tertiary, fontStyle: 'italic' },
  dagilimSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  dagilimKat: { ...typography.body, flex: 2, fontSize: 12 },
  dagilimOran: { ...typography.caption, textAlign: 'right' },
  dagilimDeger: { ...typography.body, fontSize: 12, textAlign: 'right', flex: 1 },
  uyariKutu: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  uyariIkon: { fontSize: 32 },
  uyariBaslik: typography.subtitle,
  uyariAciklama: { ...typography.body, textAlign: 'center' },
  bos: { alignItems: 'center', gap: spacing.sm, marginTop: 60 },
});
