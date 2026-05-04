import * as SQLite from 'expo-sqlite';

const DB_NAME = 'tefas_portfolio.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS islemler (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fon_kodu      TEXT NOT NULL,
      fon_adi       TEXT NOT NULL DEFAULT '',
      tip           TEXT NOT NULL CHECK(tip IN ('ALIM', 'SATIM')),
      tarih         TEXT NOT NULL,
      adet          REAL NOT NULL CHECK(adet > 0),
      birim_fiyat   REAL NOT NULL CHECK(birim_fiyat > 0),
      para_birimi   TEXT NOT NULL DEFAULT 'TRY',
      kur_tl        REAL NOT NULL DEFAULT 1.0,
      notlar        TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fifo_lotlar (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      islem_id          INTEGER NOT NULL REFERENCES islemler(id) ON DELETE CASCADE,
      fon_kodu          TEXT NOT NULL,
      tarih             TEXT NOT NULL,
      kalan_adet        REAL NOT NULL,
      birim_fiyat_fon   REAL NOT NULL,
      birim_maliyet_tl  REAL NOT NULL,
      para_birimi       TEXT NOT NULL DEFAULT 'TRY',
      kur_tl            REAL NOT NULL DEFAULT 1.0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gunluk_portfoy (
      tarih       TEXT PRIMARY KEY,
      toplam_tl   REAL NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kayitli_senaryolar (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      isim        TEXT NOT NULL,
      soklar_json TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_islemler_fon ON islemler(fon_kodu);
    CREATE INDEX IF NOT EXISTS idx_islemler_tarih ON islemler(tarih);
    CREATE INDEX IF NOT EXISTS idx_fifo_fon ON fifo_lotlar(fon_kodu);
  `);

  // Migration: stopaj_tutari kolonu (eski kurulumlar için)
  const kolonlar = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(islemler)`
  );
  const varMi = kolonlar.some((k) => k.name === 'stopaj_tutari');
  if (!varMi) {
    await db.execAsync(
      `ALTER TABLE islemler ADD COLUMN stopaj_tutari REAL DEFAULT 0;`
    );
  }
}
