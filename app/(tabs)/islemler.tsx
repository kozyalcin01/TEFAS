import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/shared/Screen';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { islemService } from '@/services/islemService';
import { colors, spacing, typography, radius } from '@/theme';
import { formatTarih, formatAdet, formatFiyat } from '@/utils/format';
import type { Islem } from '@/types';

export default function IslemlerScreen() {
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setIslemler(await islemService.listele());
    setYukleniyor(false);
  }, []);

  useFocusEffect(useCallback(() => { yukle(); }, [yukle]));

  const handleSil = (id: number) => {
    Alert.alert(
      'İşlemi Sil',
      'Bu işlem ve bağlı FIFO lotlar silinecek. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: async () => {
            await islemService.sil(id);
            yukle();
          },
        },
      ]
    );
  };

  const renderIslem = ({ item }: { item: Islem }) => {
    const isAlim = item.tip === 'ALIM';
    return (
      <Card style={styles.islemKarti}>
        <View style={styles.satir1}>
          <View style={styles.solKisim}>
            <Badge
              label={item.tip}
              positive={isAlim}
              negative={!isAlim}
            />
            <Text style={styles.fonKodu}>{item.fon_kodu}</Text>
          </View>
          <TouchableOpacity onPress={() => handleSil(item.id)} style={styles.silButon}>
            <Text style={styles.silText}>✕</Text>
          </TouchableOpacity>
        </View>
        {item.fon_adi ? (
          <Text style={styles.fonAdi} numberOfLines={1}>{item.fon_adi}</Text>
        ) : null}
        <View style={styles.satir2}>
          <View>
            <Text style={styles.etiket}>Tarih</Text>
            <Text style={styles.deger}>{formatTarih(item.tarih)}</Text>
          </View>
          <View>
            <Text style={styles.etiket}>Adet</Text>
            <Text style={styles.deger}>{formatAdet(item.adet)}</Text>
          </View>
          <View>
            <Text style={styles.etiket}>Fiyat ({item.para_birimi})</Text>
            <Text style={styles.deger}>{formatFiyat(item.birim_fiyat, item.para_birimi)}</Text>
          </View>
          {item.para_birimi !== 'TRY' && (
            <View>
              <Text style={styles.etiket}>Kur</Text>
              <Text style={styles.deger}>{item.kur_tl.toFixed(4)}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.baslik}>İşlemler</Text>
        <View style={styles.butonlar}>
          <TouchableOpacity
            style={[styles.buton, { backgroundColor: colors.positiveLight }]}
            onPress={() => router.push('/transaction/alim')}
          >
            <Text style={[styles.butonText, { color: colors.positive }]}>+ Alım</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buton, { backgroundColor: colors.negativeLight }]}
            onPress={() => router.push('/transaction/satim')}
          >
            <Text style={[styles.butonText, { color: colors.negative }]}>– Satış</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={islemler}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderIslem}
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.bos}>
            <Text style={styles.bosText}>Henüz işlem yok.</Text>
            <Text style={styles.bosAlt}>Yukarıdan alım veya satış ekleyin.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  baslik: typography.title,
  butonlar: { flexDirection: 'row', gap: spacing.sm },
  buton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  butonText: { fontWeight: '700', fontSize: 14 },
  liste: { padding: spacing.md, gap: spacing.sm },
  islemKarti: { gap: spacing.sm },
  satir1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  solKisim: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fonKodu: { ...typography.subtitle, letterSpacing: 1 },
  fonAdi: { ...typography.body, fontSize: 13 },
  satir2: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  etiket: { ...typography.caption, fontSize: 10, textTransform: 'uppercase' },
  deger: { ...typography.body, color: colors.text.primary, fontSize: 13, marginTop: 2 },
  silButon: { padding: spacing.xs },
  silText: { color: colors.text.tertiary, fontSize: 16 },
  bos: { alignItems: 'center', marginTop: 80 },
  bosText: typography.subtitle,
  bosAlt: { ...typography.body, marginTop: spacing.xs },
});
