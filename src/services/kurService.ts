import type { ParaBirimi } from '@/types';

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

let cache: { data: Record<string, number>; fetchedAt: number } | null = null;

async function fetchKurlar(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(TCMB_URL);
  const xml = await res.text();
  const kurlar: Record<string, number> = {};

  const matches = xml.matchAll(
    /<Currency[^>]*Kod="([A-Z]+)"[^>]*>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/g
  );

  for (const m of matches) {
    const [, kod, deger] = m;
    kurlar[kod] = parseFloat(deger);
  }

  cache = { data: kurlar, fetchedAt: Date.now() };
  return kurlar;
}

export async function getKurTL(paraBirimi: ParaBirimi): Promise<number> {
  if (paraBirimi === 'TRY') return 1.0;
  const kurlar = await fetchKurlar();
  const kur = kurlar[paraBirimi];
  if (!kur) throw new Error(`${paraBirimi} kuru bulunamadı`);
  return kur;
}

export async function tumKurlar(): Promise<Record<string, number>> {
  return fetchKurlar();
}
