import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { useAcikPozisyonlar, usePortfoyDegeri } from '@/hooks/usePortfolyo';
import { useQueries } from '@tanstack/react-query';
import { tefasService } from '@/services/tefasService';
import { colors, spacing, typography, radius } from '@/theme';
import { formatTL, formatPercent } from '@/utils/format';
import type { StresVarlikSinifi } from '@/types';

type Soklar = Partial<Record<StresVarlikSinifi, number>>;

const VARLIK_SINIFLARI: { key: StresVarlikSinifi; label: string; emoji: string }[] = [
  { key: 'Hisse Senedi',   label: 'Hisse Senedi (Yurt İçi)', emoji: '📈' },
  { key: 'Yabancı Hisse',  label: 'Hisse Senedi (Yurt Dışı)', emoji: '🌍' },
  { key: 'Devlet Tahvili', label: 'Devlet Tahvili / TL Bono', emoji: '🏦' },
  { key: 'Eurobond',       label: 'Eurobond / Yab. Tahvil', emoji: '🌐' },
  { key: 'Altın',          label: 'Altın / Kıymetli Maden', emoji: '🥇' },
  { key: 'Repo',           label: 'Repo / Ters Repo', emoji: '🔄' },
  { key: 'Para Piyasası',  label: 'Para Piyasası Araçları', emoji: '💵' },
  { key: 'Döviz',          label: 'Döviz (USD, EUR, vb.)', emoji: '💱' },
  { key: 'Emtia',          label: 'Emtia', emoji: '🛢️' },
];

const HAZIR_SENARYOLAR: { isim: string; emoji: string; soklar: Soklar }[] = [
  {
    isim: 'Döviz Krizi', emoji: '💱',
    soklar: {
      'Hisse Senedi': -0.20, 'Devlet Tahvili': -0.15,
      'Eurobond': 0.10, 'Altın': 0.05, 'Döviz': 0.25, 'Para Piyasası': -0.05,
    },
  },
  {
    isim: 'Sert Faiz Artışı', emoji: '📈',
    soklar: {
      'Hisse Senedi': -0.15, 'Devlet Tahvili': -0.20,
      'Eurobond': -0.08, 'Altın': -0.03, 'Para Piyasası': 0.08,
    },
  },
  {
    isim: 'Global Düşüş', emoji: '🌍',
    soklar: {
      'Hisse Senedi': -0.30, 'Yabancı Hisse': -0.30,
      'Devlet Tahvili': 0.05, 'Eurobond': -0.10, 'Altın': 0.15,
    },
  },
  {
    isim: 'Altın Rallisi', emoji: '🥇',
    soklar: { 'Altın': 0.25, 'Hisse Senedi': -0.05 },
  },
  {
    isim: 'Sıfırla', emoji: '🔄',
    soklar: {},
  },
];

export default function SenaryoScreen() {
  const [soklar, setSoklar] = useState<Soklar>({});

  const { data: pozisyonlar = [] } = useAcikPozisyonlar();
  const { pozisyonlar: pozHesapli, toplamMevcutTL } = usePortfoyDegeri();

  const portfoySorguları = useQueries({
    queries: pozisyonlar.map((poz) => ({
      queryKey: ['fon-portfoy', poz.fon_kodu],
      queryFn: () => tefasService.getFonPortfoy(poz.fon_kodu),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });

  // Senaryo etkisini hesapla
  const senaryoEtkisi = useMemo(() => {
    let toplamEtki = 0;
    pozisyonlar.forEach((poz, i) => {
      const dagilim = portfoySorguları[i]?.data ?? [];
      const fon = pozHesapli.find((p) => p.fon_kodu === poz.fon_kodu);
      const fonDeger = fon?.mevcutDegerTL ?? poz.toplam_maliyet_tl;

      const fonEtki = dagilim.reduce((s, kalem) => {
        const sok = soklar[kalem.kategori as StresVarlikSinifi] ?? 0;
        return s + fonDeger * kalem.oran * sok;
      }, 0);
      toplamEtki += fonEtki;
    });
    return toplamEtki;
  }, [soklar, pozisyonlar, pozHesapli, portfoySorguları]);

  const senaryoSonrasiTL = toplamMevcutTL + senaryoEtkisi;
  const senaryoYuzde = toplamMevcutTL > 0 ? senaryoEtkisi / toplamMevcutTL : 0;
  const isPositive = senaryoEtkisi >= 0;

  const setSok = (key: StresVarlikSinifi, value: number) => {
    setSoklar((prev) => ({ ...prev, [key]: parseFloat(value.toFixed(2)) }));
  };

  const uygulaHazir = (s: typeof HAZIR_SENARYOLAR[0]) => {
    setSoklar(s.soklar);
  };

  return (
    <Screen scroll>
      <Text style={typography.title}>Stres Senaryosu</Text>
      <Text style={[typography.body, { marginBottom: spacing.lg }]}>
        Varlık sınıflarına şok uygulayarak portföy etkisini görün.
      </Text>

      {/* Hazır senaryolar */}
      <Text style={[typography.caption, { textTransform: 'uppercase', marginBottom: spacing.sm }]}>
        Hazır Senaryolar
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        <View style={styles.hazirRow}>
          {HAZIR_SENARYOLAR.map((s) => (
            <TouchableOpacity
              key={s.isim}
              style={styles.hazirBtn}
              onPress={() => uygulaHazir(s)}
            >
              <Text style={styles.hazirEmoji}>{s.emoji}</Text>
              <Text style={styles.hazirText}>{s.isim}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Slider'lar */}
      <Card style={styles.sliderKart}>
        {VARLIK_SINIFLARI.map(({ key, label, emoji }) => {
          const val = soklar[key] ?? 0;
          return (
            <View key={key} style={styles.sliderSatir}>
              <View style={styles.sliderBaslik}>
                <Text style={styles.sliderEmoji}>{emoji}</Text>
                <Text style={styles.sliderLabel}>{label}</Text>
                <Text style={[styles.sliderDeger, { color: val >= 0 ? colors.positive : colors.negative }]}>
                  {val >= 0 ? '+' : ''}{(val * 100).toFixed(0)}%
                </Text>
              </View>
              <Slider
                minimumValue={-0.5}
                maximumValue={0.5}
                step={0.01}
                value={val}
                onValueChange={(v) => setSok(key, v)}
                minimumTrackTintColor={val >= 0 ? colors.positive : colors.negative}
                maximumTrackTintColor={colors.bg.tertiary}
                thumbTintColor={colors.accent}
                style={styles.slider}
              />
            </View>
          );
        })}
      </Card>

      {/* Sonuç */}
      <Card style={[styles.sonucKart, { borderColor: isPositive ? colors.positive : colors.negative }]}>
        <Text style={[typography.caption, { textTransform: 'uppercase' }]}>Portföy Etkisi</Text>
        <View style={styles.sonucSatir}>
          <View>
            <Text style={styles.sonucEtiket}>Mevcut Değer</Text>
            <Text style={styles.sonucDeger}>{formatTL(toplamMevcutTL)}</Text>
          </View>
          <Text style={[styles.ok, { color: isPositive ? colors.positive : colors.negative }]}>→</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.sonucEtiket}>Senaryo Sonrası</Text>
            <Text style={[styles.sonucDeger, { color: isPositive ? colors.positive : colors.negative }]}>
              {formatTL(senaryoSonrasiTL)}
            </Text>
          </View>
        </View>
        <View style={[styles.degisimKutu, { backgroundColor: isPositive ? colors.positiveLight : colors.negativeLight }]}>
          <Text style={[styles.degisimBuyuk, { color: isPositive ? colors.positive : colors.negative }]}>
            {formatPercent(senaryoYuzde)}
          </Text>
          <Text style={[styles.degisimTL, { color: isPositive ? colors.positive : colors.negative }]}>
            ({isPositive ? '+' : ''}{formatTL(Math.abs(senaryoEtkisi))})
          </Text>
        </View>
        {portfoySorguları.every((q) => !q.data || q.data.length === 0) && pozisyonlar.length > 0 && (
          <Text style={styles.uyari}>
            ⚠️ Fon portföy dağılımı alınamadığı için etki hesaplanamadı.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hazirRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  hazirBtn: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 90,
  },
  hazirEmoji: { fontSize: 20, marginBottom: 4 },
  hazirText: { ...typography.caption, textAlign: 'center' },
  sliderKart: { gap: spacing.sm, marginBottom: spacing.md },
  sliderSatir: { gap: 2 },
  sliderBaslik: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sliderEmoji: { fontSize: 16, width: 24 },
  sliderLabel: { ...typography.body, flex: 1, fontSize: 13, color: colors.text.primary },
  sliderDeger: { ...typography.caption, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  slider: { marginTop: -4 },
  sonucKart: { borderWidth: 1.5, gap: spacing.md, marginBottom: spacing.xl },
  sonucSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sonucEtiket: typography.caption,
  sonucDeger: { ...typography.subtitle, fontSize: 17, marginTop: 2 },
  ok: { fontSize: 24, fontWeight: '300' },
  degisimKutu: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  degisimBuyuk: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  degisimTL: { ...typography.subtitle, fontSize: 14 },
  uyari: { ...typography.caption, color: colors.neutral, textAlign: 'center', marginTop: spacing.xs },
});
