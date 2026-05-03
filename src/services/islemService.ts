import { getDb } from './database';
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

  async sil(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM islemler WHERE id = ?', [id]);
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
