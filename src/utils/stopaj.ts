/**
 * Stopaj (withholding tax) hesaplama yardımcıları.
 *
 * Türkiye'de yatırım fonları için stopaj oranı:
 * - Standart oran: %10 (GVK Geçici Madde 67)
 * - Yalnızca POZİTİF kâr üzerinden hesaplanır; zarar durumunda stopaj = 0
 *
 * İleride fon türüne göre oran farklılaştırması (hisse yoğun = %0) eklenebilir.
 */

export const STOPAJ_ORANI = 0.10;

/**
 * Tek bir pozisyon için stopaj hesaplar.
 * @param maliyetTL    Alım toplam maliyeti (TL)
 * @param mevcutDegerTL Güncel toplam değer (TL) — bugün satılsa
 * @returns Ödenecek stopaj tutarı (TL). Zarar varsa 0 döner.
 */
export function stopajHesapla(maliyetTL: number, mevcutDegerTL: number): number {
  const kar = mevcutDegerTL - maliyetTL;
  if (kar <= 0) return 0;
  return kar * STOPAJ_ORANI;
}

/**
 * Birden fazla pozisyon için toplam stopaj.
 */
export function toplamStopajHesapla(
  pozisyonlar: Array<{ maliyetTL: number; mevcutDegerTL: number | null }>
): number {
  return pozisyonlar.reduce((toplam, poz) => {
    if (poz.mevcutDegerTL == null) return toplam;
    return toplam + stopajHesapla(poz.maliyetTL, poz.mevcutDegerTL);
  }, 0);
}
