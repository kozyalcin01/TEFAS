export type ParaBirimi = 'TRY' | 'USD' | 'EUR' | 'GBP';
export type IslemTipi = 'ALIM' | 'SATIM';
export type Periyod = 'hafta' | '1ay' | '3ay' | '6ay' | '1yil' | '3yil' | '5yil';

export interface Islem {
  id: number;
  fon_kodu: string;
  fon_adi: string;
  tip: IslemTipi;
  tarih: string;           // ISO date: "2026-05-01"
  adet: number;
  birim_fiyat: number;     // fon para biriminde
  para_birimi: ParaBirimi;
  kur_tl: number;          // işlem anındaki TL kuru (TRY için 1.0)
  notlar?: string;
  created_at: string;
}

export interface FifoLot {
  id: number;
  islem_id: number;
  fon_kodu: string;
  tarih: string;
  kalan_adet: number;
  birim_fiyat_fon: number; // fon para biriminde
  birim_maliyet_tl: number; // alış anında TL maliyet
  para_birimi: ParaBirimi;
  kur_tl: number;
}

export interface FifoSatisSonuc {
  karZararTL: number;
  karZararFonPB: number;
  toplamMaliyetTL: number;
  stopajOrani: number;
  stopajTL: number;
  netKarTL: number;
  kullanilanLotlar: { lotId: number; adet: number }[];
}

export interface GunlukPortfoy {
  tarih: string;
  toplam_tl: number;
}

export interface AcikPozisyon {
  fon_kodu: string;
  fon_adi: string;
  para_birimi: ParaBirimi;
  toplam_adet: number;
  ort_maliyet_tl: number;
  toplam_maliyet_tl: number;
}

export interface FonFiyat {
  fon_kodu: string;
  fon_adi: string;
  fiyat: number;
  gunluk_getiri_yuzde: number;
  tarih: string;
}

export interface FiyatNoktasi {
  tarih: string;
  fiyat: number;
}

export interface DonemselGetiri {
  fon_kodu: string;
  getiriler: Partial<Record<Periyod | 'yb', number>>;
}

export interface PortfoyDagilimKalem {
  kategori: string;
  oran: number; // 0-1
}

export interface VarlikSinifi {
  isim: string;
  oran: number;   // portföydeki ağırlık (0-1)
  degerTL: number;
}

export type StresVarlikSinifi =
  | 'Hisse Senedi'
  | 'Yabancı Hisse'
  | 'Devlet Tahvili'
  | 'Eurobond'
  | 'Altın'
  | 'Repo'
  | 'Para Piyasası'
  | 'Döviz'
  | 'Emtia'
  | 'Diğer';

export interface KayitliSenaryo {
  id: number;
  isim: string;
  soklar: Partial<Record<StresVarlikSinifi, number>>;
  created_at: string;
}

export interface PortfoyPerformans {
  baslangicDegeriTL: number;
  mevcutDegeriTL: number;
  mutlakGetiriTL: number;
  mutlakGetiriYuzde: number;
  benchmarkYuzde: number;
  alphaYuzde: number;
}
