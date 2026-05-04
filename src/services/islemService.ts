import { getDb } from './database';
import { stopajHesapla } from '@/utils/stopaj';
import type { Islem, IslemTipi, ParaBirimi, AcikPozisyon } from '@/types';

export const islemService = {
  async listele(): Promise<Islem[]> {
    const db = await getDb();
    return db.getAllAsync<Islem>(
      'SELECT * FROM islemler ORDER BY tarih DESC, created_at DESC'
    );
  },

  async listeleByFon(fonKodu: string): Promise<Islem[]> {
    const db = await getDb();
    return db.getAllAsync<Islem>(
      'SELECT * FROM islemler WHERE fon_kodu = ? ORDER BY tarih ASC',
      [fonKodu]
    );
  },

  async ekleAlim(params: {
    fonKodu: string;
    fonAdi: string;
    tarih: string;
    adet: number;
    birimFiyat: number;
    paraBirimi: ParaBirimi;
    kurTL: number;
    notlar?: string;
  }): Promise<number> {
    const db = await getDb();
    const birimMaliyetTL = params.birimFiyat * params.kurTL;

    let islemId!: number;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO islemler (fon_kodu, fon_adi, tip, tarih, adet, birim_fiyat, para_birimi, kur_tl, notlar)
         VALUES (?, ?, 'ALIM', ?, ?, ?, ?, ?, ?)`,
        [
          params.fonKodu,
          params.fonAdi,
          params.tarih,
          params.adet,
          params.birimFiyat,
          params.paraBirimi,
          params.kurTL,
          params.notlar ?? null,
        ]
      );
      islemId = result.lastInsertRowId;

      await db.runAsync(
        `INSERT INTO fifo_lotlar (islem_id, fon_kodu, tarih, kalan_adet, birim_fiyat_fon, birim_maliyet_tl, para_birimi, kur_tl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          islemId,
          params.fonKodu,
          params.tarih,
          params.adet,
          params.birimFiyat,
          birimMaliyetTL,
          params.paraBirimi,
          params.kurTL,
        ]
      );
    });

    return islemId;
  },

  /**
   * Satım işlemi kaydeder. FIFO lotları tüketir ve stopaj hesaplayıp saklar.
   * @param satimFiyati Güncel birim fiyat (TL)
   */
  async ekleSatim(params: {
    fonKodu: string;
    fonAdi: string;
    tarih: string;
    adet: number;
    birimFiyat: number;
    paraBirimi: ParaBirimi;
    kurTL: number;
    notlar?: string;
  }): Promise<number> {
    const db = await getDb();

    // FIFO lotlardan maliyet hesapla
    const lotlar = await db.getAllAsync<{
      id: number;
      kalan_adet: number;
      birim_maliyet_tl: number;
    }>(
      `SELECT id, kalan_adet, birim_maliyet_tl FROM fifo_lotlar
       WHERE fon_kodu = ? AND kalan_adet > 0.000001
       ORDER BY tarih ASC`,
      [params.fonKodu]
    );

    let kalanSatim = params.adet;
    let toplamMaliyetTL = 0;
    const lotGuncellemeleri: Array<{ id: number; yeniAdet: number }> = [];

    for (const lot of lotlar) {
      if (kalanSatim <= 0) break;
      const kullanilanAdet = Math.min(kalanSatim, lot.kalan_adet);
      toplamMaliyetTL += kullanilanAdet * lot.birim_maliyet_tl;
      lotGuncellemeleri.push({ id: lot.id, yeniAdet: lot.kalan_adet - kullanilanAdet });
      kalanSatim -= kullanilanAdet;
    }

    const satimDegerTL = params.adet * params.birimFiyat * params.kurTL;
    const stopajTutari = stopajHesapla(toplamMaliyetTL, satimDegerTL);

    let islemId!: number;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO islemler
           (fon_kodu, fon_adi, tip, tarih, adet, birim_fiyat, para_birimi, kur_tl, notlar, stopaj_tutari)
         VALUES (?, ?, 'SATIM', ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.fonKodu,
          params.fonAdi,
          params.tarih,
          params.adet,
          params.birimFiyat,
          params.paraBirimi,
          params.kurTL,
          params.notlar ?? null,
          stopajTutari,
        ]
      );
      islemId = result.lastInsertRowId;

      for (const g of lotGuncellemeleri) {
        await db.runAsync(
          `UPDATE fifo_lotlar SET kalan_adet = ? WHERE id = ?`,
          [g.yeniAdet, g.id]
        );
      }
    });

    return islemId;
  },

  async sil(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM islemler WHERE id = ?', [id]);
  },

  async stopajMuafMi(fonKodu: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ fon_kodu: string }>(
      `SELECT fon_kodu FROM stopaj_muaf_fonlar WHERE fon_kodu = ?`,
      [fonKodu.toUpperCase()]
    );
    return row != null;
  },

  async stopajMuafToggle(fonKodu: string): Promise<boolean> {
    const db = await getDb();
    const muaf = await this.stopajMuafMi(fonKodu);
    if (muaf) {
      await db.runAsync(`DELETE FROM stopaj_muaf_fonlar WHERE fon_kodu = ?`, [fonKodu.toUpperCase()]);
      return false;
    } else {
      await db.runAsync(`INSERT OR IGNORE INTO stopaj_muaf_fonlar (fon_kodu) VALUES (?)`, [fonKodu.toUpperCase()]);
      return true;
    }
  },

  async stopajMuafListesi(): Promise<string[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ fon_kodu: string }>(`SELECT fon_kodu FROM stopaj_muaf_fonlar`);
    return rows.map((r) => r.fon_kodu);
  },

  async acikPozisyonlar(): Promise<AcikPozisyon[]> {
    const db = await getDb();
    return db.getAllAsync<AcikPozisyon>(`
      SELECT
        fl.fon_kodu,
        i.fon_adi,
        i.para_birimi,
        SUM(fl.kalan_adet)                        AS toplam_adet,
        SUM(fl.kalan_adet * fl.birim_maliyet_tl)
          / SUM(fl.kalan_adet)                    AS ort_maliyet_tl,
        SUM(fl.kalan_adet * fl.birim_maliyet_tl)  AS toplam_maliyet_tl
      FROM fifo_lotlar fl
      JOIN islemler i ON i.id = fl.islem_id
      WHERE fl.kalan_adet > 0.000001
      GROUP BY fl.fon_kodu
      ORDER BY toplam_maliyet_tl DESC
    `);
  },

  async acikPozisyonFon(fonKodu: string): Promise<AcikPozisyon | null> {
    const db = await getDb();
    return db.getFirstAsync<AcikPozisyon>(
      `SELECT
        fl.fon_kodu,
        i.fon_adi,
        i.para_birimi,
        SUM(fl.kalan_adet)                        AS toplam_adet,
        SUM(fl.kalan_adet * fl.birim_maliyet_tl)
          / SUM(fl.kalan_adet)                    AS ort_maliyet_tl,
        SUM(fl.kalan_adet * fl.birim_maliyet_tl)  AS toplam_maliyet_tl
       FROM fifo_lotlar fl
       JOIN islemler i ON i.id = fl.islem_id
       WHERE fl.fon_kodu = ? AND fl.kalan_adet > 0.000001
       GROUP BY fl.fon_kodu`,
      [fonKodu]
    );
  },
};
