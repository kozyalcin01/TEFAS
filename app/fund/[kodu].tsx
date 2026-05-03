import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { islemService } from '@/services/islemService';
import { tefasService } from '@/services/tefasService';
import { fifoService } from '@/services/fifoService';
import { colors, spacing, typography } from '@/theme';
import { formatTL, formatPercent, formatAdet, formatTarih, formatFiyat } from '@/utils/format';

export default function FonDetayScreen() {
  const { kodu } = useLocalSearchParams<{ kodu: string }>();

  const { data: fiyat, isLoading: fiyatYuk } = useQuery({
    queryKey: ['fon-fiyat', kodu],
    queryFn: () => tefasService.getFonFiyat(kodu),
    staleTime: 60 * 60 * 1000,
  });

  const { data: getiriler } = useQuery({
    queryKey: ['donemsel-getiri', kodu],
    queryFn: () => tefasService.getDonemselGetiri(kodu),
    staleTime: 60 * 60 * 1000,
  });

  const { data: islemler = [] } = useQuery({
    queryKey: ['islemler-fon', kodu],
    queryFn: () => islemService.listeleByFon(kodu),
  });

  const { data: pozisyon } = useQuery({
    queryKey: ['pozisyon-fon', kodu],
    queryFn: () => islemService.acikPozisyonFon(kodu),
  });

  const { data: fifoLotlar = [] } = useQuery({
    queryKey: ['fifo-lotlar', kodu],
    queryFn: () => fifoService.acikLotlar(kodu),
  });

  const mevcutDeger = pozisyon && fiyat
    ? pozisyon.toplam_adet * fiyat.fiyat
    : null;
  const getiriTL = mevcutDeger != null && pozisyon
    ? mevcutDeger - pozisyon.toplam_maliyet_tl
    : null;
  const getiriYuzde = getiriTL != null && pozisyon
    ? getiriTL / pozisyon.toplam_maliyet_tl
    : null;

  const PERIYOD_ETIKETLER: Record<string, string> = {
    '1ay': '1 Ay', '3ay': '3 Ay', '6ay': '6 Ay',
    yb: 'Yılbaşı', '1yil': '1 Yıl', '3yil': '3 Yıl', '5yil': '5 Yıl',
  };

  return (
    <Screen scroll>
      {fiyatYuk ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={[typography.title, { letterSpacing: 2 }]}>{kodu}</Text>
          {fiyat && <Text style={[typography.body, { marginBottom: spacing.lg }]}>{fiyat.fon_adi}</Text>}

          {/* Güncel pozisyon */}
          {pozisyon && (
            <Card style={styles.pozisyonKart}>
              <Text style={styles.kartBaslik}>Pozisyonum</Text>
              <View style={styles.satirGrup}>
                <Stat label="Toplam Adet" value={formatAdet(pozisyon.toplam_adet)} />
                <Stat label="Ort. Maliyet" value={`₺${pozisyon.ort_maliyet_tl.toFixed(6)}`} />
                <Stat label="Toplam Maliyet" value={formatTL(pozisyon.toplam_maliyet_tl)} />
              </View>
              {mevcutDeger != null && (
                <View style={[styles.satirGrup, { marginTop: spacing.sm }]}>
                  <Stat label="Güncel Değer" value={formatTL(mevcutDeger)} />
                  {getiriTL != null && (
                    <Stat
                      label="Kâr / Zarar"
                      value={`${getiriTL >= 0 ? '+' : ''}${formatTL(getiriTL)}`}
                      color={getiriTL >= 0 ? colors.positive : colors.negative}
                    />
                  )}
                  {getiriYuzde != null && (
                    <Stat
                      label="Getiri %"
                      value={formatPercent(getiriYuzde)}
                      color={getiriYuzde >= 0 ? colors.positive : colors.negative}
                    />
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Güncel fiyat */}
          {fiyat && (
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={styles.kartBaslik}>Güncel Fiyat</Text>
              <Text style={styles.buyukFiyat}>{fiyat.fiyat.toFixed(6)} ₺</Text>
              <Badge
                label={`${fiyat.gunluk_getiri_yuzde >= 0 ? '+' : ''}${(fiyat.gunluk_getiri_yuzde * 100).toFixed(2)}% bugün`}
                positive={fiyat.gunluk_getiri_yuzde >= 0}
                negative={fiyat.gunluk_getiri_yuzde < 0}
              />
            </Card>
          )}

          {/* Dönemsel getiriler */}
          {getiriler && (
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={styles.kartBaslik}>Dönemsel Getiriler</Text>
              <View style={styles.getiriGrid}>
                {Object.entries(getiriler.getiriler).map(([periyod, deger]) => (
                  <View key={periyod} style={styles.getiriKalem}>
                    <Text style={styles.getiriEtiket}>{PERIYOD_ETIKETLER[periyod] ?? periyod}</Text>
                    <Text style={[
                      styles.getiriDeger,
                      { color: (deger ?? 0) >= 0 ? colors.positive : colors.negative },
                    ]}>
                      {formatPercent(deger ?? 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* FIFO Lotlar */}
          {fifoLotlar.length > 0 && (
            <>
              <Text style={[typography.h2, { marginBottom: spacing.sm }]}>Açık FIFO Lotları</Text>
              <View style={styles.tablo}>
                <View style={[styles.tbSatir, styles.tbBaslik]}>
                  <Text style={styles.tbHucre}>Tarih</Text>
                  <Text style={[styles.tbHucre, styles.sag]}>Kalan Adet</Text>
                  <Text style={[styles.tbHucre, styles.sag]}>Maliyet/TL</Text>
                </View>
                {fifoLotlar.map((lot) => (
                  <View key={lot.id} style={styles.tbSatir}>
                    <Text style={styles.tbHucre}>{formatTarih(lot.tarih)}</Text>
                    <Text style={[styles.tbHucre, styles.sag]}>{formatAdet(lot.kalan_adet)}</Text>
                    <Text style={[styles.tbHucre, styles.sag]}>₺{lot.birim_maliyet_tl.toFixed(6)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* İşlem geçmişi */}
          {islemler.length > 0 && (
            <>
              <Text style={[typography.h2, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                İşlem Geçmişi
              </Text>
              <View style={{ gap: spacing.xs, paddingBottom: spacing.xl }}>
                {islemler.map((i) => (
                  <View key={i.id} style={styles.islemSatir}>
                    <Badge
                      label={i.tip}
                      positive={i.tip === 'ALIM'}
                      negative={i.tip === 'SATIM'}
                    />
                    <Text style={styles.islemTarih}>{formatTarih(i.tarih)}</Text>
                    <Text style={styles.islemAdet}>{formatAdet(i.adet)} pay</Text>
                    <Text style={styles.islemFiyat}>
                      {formatFiyat(i.birim_fiyat, i.para_birimi)} {i.para_birimi}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.text.tertiary, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: color ?? colors.text.primary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kartBaslik: { ...typography.caption, textTransform: 'uppercase', marginBottom: spacing.sm },
  pozisyonKart: { marginBottom: spacing.md },
  satirGrup: { flexDirection: 'row', gap: spacing.sm },
  buyukFiyat: { fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  getiriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  getiriKalem: { minWidth: '28%' },
  getiriEtiket: { ...typography.caption, fontSize: 11 },
  getiriDeger: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  tablo: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tbSatir: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tbBaslik: { backgroundColor: colors.bg.tertiary },
  tbHucre: { ...typography.caption, flex: 1 },
  sag: { textAlign: 'right' },
  islemSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  islemTarih: { ...typography.caption, flex: 1 },
  islemAdet: { ...typography.caption },
  islemFiyat: { ...typography.caption, textAlign: 'right' },
});
