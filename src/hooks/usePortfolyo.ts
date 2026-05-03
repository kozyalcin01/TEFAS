import { useQuery, useQueries } from '@tanstack/react-query';
import { islemService } from '@/services/islemService';
import { tefasService } from '@/services/tefasService';
import type { AcikPozisyon } from '@/types';

export function useAcikPozisyonlar() {
  return useQuery({
    queryKey: ['acik-pozisyonlar'],
    queryFn: () => islemService.acikPozisyonlar(),
  });
}

export function usePortfoyDegeri() {
  const { data: pozisyonlar = [] } = useAcikPozisyonlar();

  const fiyatSorguları = useQueries({
    queries: pozisyonlar.map((poz) => ({
      queryKey: ['fon-fiyat', poz.fon_kodu],
      queryFn: () => tefasService.getFonFiyat(poz.fon_kodu),
      staleTime: 60 * 60 * 1000,
    })),
  });

  const isLoading = fiyatSorguları.some((q) => q.isLoading);
  const mevcutFiyatlar: Record<string, number> = {};
  const gunlukGetiriler: Record<string, number> = {};

  fiyatSorguları.forEach((q, i) => {
    const fonKodu = pozisyonlar[i]?.fon_kodu;
    if (fonKodu && q.data) {
      mevcutFiyatlar[fonKodu] = q.data.fiyat;
      gunlukGetiriler[fonKodu] = q.data.gunluk_getiri_yuzde;
    }
  });

  const pozisyonlarHesapli = pozisyonlar.map((poz) => {
    const mevcutFiyat = mevcutFiyatlar[poz.fon_kodu];
    if (!mevcutFiyat) return { ...poz, mevcutDegerTL: null, getiriYuzde: null, getiriTL: null };
    const mevcutDegerTL = poz.toplam_adet * mevcutFiyat * poz.ort_maliyet_tl / (mevcutFiyatlar[poz.fon_kodu] !== undefined ? 1 : 1);
    // Doğru hesaplama: mevcut değer = adet × güncel fiyat × kur (kur pozisyonun ortalama maliyetinden türetilemez, TEFAS TRY bazında döndürür)
    const mevcutDegerTL2 = poz.toplam_adet * mevcutFiyat;
    const getiriTL = mevcutDegerTL2 - poz.toplam_maliyet_tl;
    const getiriYuzde = poz.toplam_maliyet_tl > 0 ? getiriTL / poz.toplam_maliyet_tl : 0;
    return { ...poz, mevcutDegerTL: mevcutDegerTL2, getiriTL, getiriYuzde };
  });

  const toplamMevcutTL = pozisyonlarHesapli.reduce((s, p) => s + (p.mevcutDegerTL ?? 0), 0);
  const toplamMaliyetTL = pozisyonlar.reduce((s, p) => s + p.toplam_maliyet_tl, 0);
  const toplamGetiriTL = toplamMevcutTL - toplamMaliyetTL;
  const toplamGetiriYuzde = toplamMaliyetTL > 0 ? toplamGetiriTL / toplamMaliyetTL : 0;

  const gunlukDegisimTL = pozisyonlarHesapli.reduce((s, p) => {
    if (!p.mevcutDegerTL || !gunlukGetiriler[p.fon_kodu]) return s;
    return s + p.mevcutDegerTL * (gunlukGetiriler[p.fon_kodu] / 100);
  }, 0);

  return {
    pozisyonlar: pozisyonlarHesapli,
    toplamMevcutTL,
    toplamMaliyetTL,
    toplamGetiriTL,
    toplamGetiriYuzde,
    gunlukDegisimTL,
    isLoading,
    mevcutFiyatlar,
  };
}
