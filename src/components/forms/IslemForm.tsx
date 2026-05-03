import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, typography } from '@/theme';
import { islemService } from '@/services/islemService';
import { fifoService } from '@/services/fifoService';
import { getKurTL } from '@/services/kurService';
import { tefasService } from '@/services/tefasService';
import { formatPercent } from '@/utils/format';
import type { IslemTipi, ParaBirimi } from '@/types';

const PARA_BIRIMLERI: ParaBirimi[] = ['TRY', 'USD', 'EUR', 'GBP'];

export function IslemForm({ tip }: { tip: IslemTipi }) {
  const queryClient = useQueryClient();
  const [fonKodu, setFonKodu] = useState('');
  const [fonAdi, setFonAdi] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [adet, setAdet] = useState('');
  const [birimFiyat, setBirimFiyat] = useState('');
  const [paraBirimi, setParaBirimi] = useState<ParaBirimi>('TRY');
  const [notlar, setNotlar] = useState('');
  const [loading, setLoading] = useState(false);
  const [kurYukleniyor, setKurYukleniyor] = useState(false);
  const [guncelKur, setGuncelKur] = useState<number | null>(null);
  const [onaySonuc, setOnaySonuc] = useState<{ karZarar: number; stopaj: number } | null>(null);

  const onFonKoduDegis = useCallback(async (text: string) => {
    const kod = text.toUpperCase().trim();
    setFonKodu(kod);
    if (kod.length >= 2) {
      const sonuclar = await tefasService.araFon(kod, 1);
      if (sonuclar.length > 0) setFonAdi(sonuclar[0].fon_adi);
    }
  }, []);

  const onParaBirimiDegis = useCallback(async (pb: ParaBirimi) => {
    setParaBirimi(pb);
    if (pb !== 'TRY') {
      setKurYukleniyor(true);
      try {
        const kur = await getKurTL(pb);
        setGuncelKur(kur);
      } catch {
        Alert.alert('Uyarı', 'Güncel kur alınamadı. Manuel girebilirsiniz.');
      } finally {
        setKurYukleniyor(false);
      }
    } else {
      setGuncelKur(1);
    }
  }, []);

  const handleKaydet = async () => {
    if (!fonKodu || !adet || !birimFiyat) {
      Alert.alert('Eksik Bilgi', 'Fon kodu, adet ve birim fiyat zorunludur.');
      return;
    }
    const adetNum = parseFloat(adet.replace(',', '.'));
    const fiyatNum = parseFloat(birimFiyat.replace(',', '.'));
    const kur = guncelKur ?? 1;

    if (isNaN(adetNum) || isNaN(fiyatNum) || adetNum <= 0 || fiyatNum <= 0) {
      Alert.alert('Hatalı Değer', 'Adet ve fiyat pozitif sayı olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      if (tip === 'ALIM') {
        await islemService.ekleAlim({
          fonKodu,
          fonAdi,
          tarih,
          adet: adetNum,
          birimFiyat: fiyatNum,
          paraBirimi,
          kurTL: kur,
        });
        await queryClient.invalidateQueries({ queryKey: ['acik-pozisyonlar'] });
        Alert.alert('Başarılı', 'Alım işlemi kaydedildi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      } else {
        const sonuc = await fifoService.satis({
          fonKodu,
          tarih,
          adet: adetNum,
          satisFiyati: fiyatNum,
          paraBirimi,
          satisKurTL: kur,
        });
        await queryClient.invalidateQueries({ queryKey: ['acik-pozisyonlar'] });
        setOnaySonuc({ karZarar: sonuc.karZararTL, stopaj: sonuc.stopajTL });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSatisOnayla = () => {
    Alert.alert(
      'İşlem Tamamlandı',
      `Kâr/Zarar: ₺${onaySonuc?.karZarar.toFixed(2)}\nStopaj: ₺${onaySonuc?.stopaj.toFixed(2)}`,
      [{ text: 'Tamam', onPress: () => router.back() }]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.baslik}>{tip === 'ALIM' ? 'Yeni Alım' : 'Satış Girişi'}</Text>

      <View style={styles.alan}>
        <Text style={styles.etiket}>Fon Kodu *</Text>
        <TextInput
          style={styles.input}
          value={fonKodu}
          onChangeText={onFonKoduDegis}
          placeholder="Örn: AAK"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="characters"
          maxLength={6}
        />
        {fonAdi ? <Text style={styles.aciklama}>{fonAdi}</Text> : null}
      </View>

      <View style={styles.alan}>
        <Text style={styles.etiket}>İşlem Tarihi *</Text>
        <TextInput
          style={styles.input}
          value={tarih}
          onChangeText={setTarih}
          placeholder="YYYY-AA-GG"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.alan}>
        <Text style={styles.etiket}>Para Birimi *</Text>
        <View style={styles.pbRow}>
          {PARA_BIRIMLERI.map((pb) => (
            <TouchableOpacity
              key={pb}
              style={[styles.pbButon, paraBirimi === pb && styles.pbSecili]}
              onPress={() => onParaBirimiDegis(pb)}
            >
              <Text style={[styles.pbText, paraBirimi === pb && styles.pbTextSecili]}>
                {pb}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {kurYukleniyor && <ActivityIndicator size="small" color={colors.accent} />}
        {guncelKur && paraBirimi !== 'TRY' && !kurYukleniyor && (
          <Text style={styles.aciklama}>
            Güncel kur: 1 {paraBirimi} = ₺{guncelKur.toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.alan}>
        <Text style={styles.etiket}>Adet *</Text>
        <TextInput
          style={styles.input}
          value={adet}
          onChangeText={setAdet}
          placeholder="0,00"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.alan}>
        <Text style={styles.etiket}>Birim Fiyat ({paraBirimi}) *</Text>
        <TextInput
          style={styles.input}
          value={birimFiyat}
          onChangeText={setBirimFiyat}
          placeholder="0,000000"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />
        {adet && birimFiyat && guncelKur && (
          <Text style={styles.aciklama}>
            Toplam TL: ₺
            {(parseFloat(adet.replace(',', '.')) *
              parseFloat(birimFiyat.replace(',', '.')) *
              guncelKur).toFixed(2)}
          </Text>
        )}
      </View>

      <View style={styles.alan}>
        <Text style={styles.etiket}>Notlar</Text>
        <TextInput
          style={[styles.input, styles.inputCok]}
          value={notlar}
          onChangeText={setNotlar}
          placeholder="İsteğe bağlı not..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      {onaySonuc ? (
        <View style={styles.onayKutu}>
          <Text style={styles.onayBaslik}>Satış Özeti</Text>
          <Text style={[styles.onayDeger, { color: onaySonuc.karZarar >= 0 ? colors.positive : colors.negative }]}>
            Kâr/Zarar: ₺{onaySonuc.karZarar.toFixed(2)}
          </Text>
          <Text style={styles.onayAciklama}>
            Stopaj (%{onaySonuc.stopaj > 0 ? '15' : '0'}): ₺{onaySonuc.stopaj.toFixed(2)}
          </Text>
          <TouchableOpacity style={styles.kaydetButon} onPress={handleSatisOnayla}>
            <Text style={styles.kaydetText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.kaydetButon, loading && styles.disabled]}
          onPress={handleKaydet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.kaydetText}>
              {tip === 'ALIM' ? 'Alımı Kaydet' : 'Satışı Hesapla'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.md },
  baslik: { ...typography.h2, marginBottom: spacing.lg },
  alan: { marginBottom: spacing.md },
  etiket: { ...typography.caption, marginBottom: spacing.xs, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
  },
  inputCok: { height: 80, textAlignVertical: 'top' },
  aciklama: { ...typography.caption, marginTop: 4, color: colors.text.secondary },
  pbRow: { flexDirection: 'row', gap: spacing.sm },
  pbButon: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pbSecili: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  pbText: { ...typography.caption, color: colors.text.secondary },
  pbTextSecili: { color: colors.accent, fontWeight: '700' },
  kaydetButon: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  kaydetText: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  onayKutu: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  onayBaslik: { ...typography.subtitle },
  onayDeger: { fontSize: 20, fontWeight: '700' },
  onayAciklama: { ...typography.body },
});
