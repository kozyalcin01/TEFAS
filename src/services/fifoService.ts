import { getDb } from './database';
import { islemService } from './islemService';
import type { FifoLot, FifoSatisSonuc, ParaBirimi } from '@/types';

const HISSE_YOGUN_FONLAR = new Set<string>(); // TEFAS'tan öğrenilince doldurulacak

function stopajOrani(fonKodu: string): number {
  return HISSE_YOGUN_FONLAR.has(fonKodu) ? 0 : 0.15;
}

export const fifoService = {
  async acikLotlar(fonKodu: string): Promise<FifoLot[]> {
    const db = await getDb();
    return db.getAllAsync<FifoLot>(
      `SELECT * FROM fifo_lotlar
       WHERE fon_kodu = ? AND kalan_adet > 0.000001
       ORDER BY tarih ASC, id ASC`,
      [fonKodu]
    );
  },

  async satis(params: {
    fonKodu: string;
    tarih: string;
    adet: number;
    satisFiyati: number;
    paraBirimi: ParaBirimi;
    satisKurTL: number;
  }): Promise<FifoSatisSonuc> {
    const { fonKodu, tarih, adet, satisFiyati, paraBirimi, satisKurTL } = params;

    const lotlar = await this.acikLotlar(fonKodu);
    const toplamAcik = lotlar.reduce((s, l) => s + l.kalan_adet, 0);

    if (toplamAcik < adet - 0.000001) {
      throw new Error(
        `Yetersiz adet: portföyde ${toplamAcik.toFixed(4)} adet var, ${adet.toFixed(4)} satmaya çalışıyorsunuz.`
      );
    }

    const db = await getDb();
    let kalanSatis = adet;
    let toplamMaliyetTL = 0;
    const kullanilanLotlar: { lotId: number; adet: number }[] = [];

    for (const lot of lotlar) {
      if (kalanSatis <= 0.000001) break;
      const kullanilan = Math.min(lot.kalan_adet, kalanSatis);
      toplamMaliyetTL += kullanilan * lot.birim_maliyet_tl;
      kullanilanLotlar.push({ lotId: lot.id, adet: kullanilan });
      kalanSatis -= kullanilan;
    }

    const satisTutarTL = adet * satisFiyati * satisKurTL;
    const karZararTL = satisTutarTL - toplamMaliyetTL;
    const sOrani = stopajOrani(fonKodu);
    const stopajTL = Math.max(0, karZararTL) * sOrani;

    // Lot adedini güncelle
    for (const { lotId, adet: kullanilan } of kullanilanLotlar) {
      await db.runAsync(
        'UPDATE fifo_lotlar SET kalan_adet = kalan_adet - ? WHERE id = ?',
        [kullanilan, lotId]
      );
    }

    // Satış işlemini kaydet
    await db.runAsync(
      `INSERT INTO islemler (fon_kodu, fon_adi, tip, tarih, adet, birim_fiyat, para_birimi, kur_tl)
       SELECT fon_kodu, fon_adi, 'SATIM', ?, ?, ?, ?, ?
       FROM islemler WHERE fon_kodu = ? LIMIT 1`,
      [tarih, adet, satisFiyati, paraBirimi, satisKurTL, fonKodu]
    );

    return {
      karZararTL,
      karZararFonPB: (satisTutarTL - toplamMaliyetTL) / satisKurTL,
      toplamMaliyetTL,
      stopajOrani: sOrani,
      stopajTL,
      netKarTL: karZararTL - stopajTL,
      kullanilanLotlar,
    };
  },

  fonuHisseYogunIsaretle(fonKodu: string) {
    HISSE_YOGUN_FONLAR.add(fonKodu);
  },
};
