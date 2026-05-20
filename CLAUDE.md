# TEFAS Portfolio App — Claude Context

## 📱 Proje Nedir?

TEFAS Portfolio, Türk yatırımcılar için yatırım fonu portföy takip uygulaması.

**Ana Özellikler:**
- 📊 Portföy değer takibi (gerçek zamanlı TEFAS fiyatları)
- 📈 Fon performans analizi (günlük, haftalık, yıllık getiriler)
- 💱 Çok para birimli fon desteği (TRY, USD, EUR vb.)
- 🧾 İşlem yönetimi (alım/satım FIFO lot tracking)
- 💰 Stopaj (vergi) hesaplaması ve muafiyet yönetimi
- 💾 Yerel SQLite veritabanı (offline-first)

**Tech Stack:**
- React Native + Expo
- TypeScript
- SQLite (expo-sqlite)
- React Query (data fetching)
- Expo Router (navigation)
- Python HTTP bridge (TEFAS API → localhost:3000)

---

## 📁 Proje Yapısı

```
tefas-portfolio/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx            # Home: portfolio overview + positions
│   │   ├── search.tsx           # Fund search & info
│   │   ├── islemler.tsx         # Transactions list
│   │   └── ayarlar.tsx          # Settings
│   └── fund/
│       └── [kod].tsx            # Fund detail page
│
├── src/
│   ├── components/
│   │   └── shared/
│   │       ├── Screen.tsx       # Safe area wrapper
│   │       ├── Card.tsx         # Reusable card component
│   │       └── Badge.tsx        # Status badge
│   │
│   ├── services/
│   │   ├── database.ts          # SQLite init + migrations
│   │   ├── islemService.ts      # Transaction & position queries
│   │   └── tefasService.ts      # HTTP bridge client (API calls)
│   │
│   ├── hooks/
│   │   └── usePortfolyo.ts      # Portfolio calculations (FIFO, stopaj)
│   │
│   ├── utils/
│   │   ├── format.ts            # TL/percent formatting
│   │   └── stopaj.ts            # Tax calculation (10% withholding)
│   │
│   ├── theme/
│   │   └── index.ts             # Colors, spacing, typography
│   │
│   └── types/
│       └── index.ts             # TypeScript interfaces
│
├── http_bridge.py               # ⭐ Python HTTP server (port 3000)
│                                # Bridges app → TEFAS API
│                                # Tools: get_fon_fiyat, donemsel_getiri_ozeti, etc.
│
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
└── .watchmanconfig              # Watchman settings (Metro bundler)
```

---

## 🗄️ Veritabanı Schema

**Tables:**

| Table | Purpose |
|-------|---------|
| `islemler` | Transactions (buy/sell) with costs |
| `fifo_lotlar` | FIFO lots tracking cost basis per unit |
| `gunluk_portfoy` | Daily snapshot (optional historical) |
| `kayitli_senaryolar` | Saved scenarios (future) |
| `stopaj_muaf_fonlar` | Exempt funds from withholding tax |

**Key Flow:**
1. User enters: "Bought 100 shares of XYZ on 2024-01-15 at 50 TL"
2. Creates: 1 `islemler` record + 1 `fifo_lotlar` record (100 shares, cost basis 50 TL)
3. On sell: FIFO consumes lots, calculates cost basis, computes tax

---

## 🌍 HTTP Bridge (http_bridge.py)

Local HTTP server on **port 3000** that bridges the app to TEFAS API.

**Why?** TEFAS API is Turkey-geo-restricted. Running it locally works; from abroad it fails.

**Endpoints:** (all POST to `/`)

| Tool | Input | Output |
|------|-------|--------|
| `get_fon_fiyat` | `fon_kodu` | `{fiyat, gunluk_getiri_yuzde, fon_adi, tarih}` |
| `get_fon_fiyat_gecmisi` | `fon_kodu, periyod` | `[{tarih, fiyat}, ...]` |
| `donemsel_getiri_ozeti` | `fon_kodu` | `{getiriler: {1ay, 3ay, 6ay, yb, 1yil, 3yil, 5yil}}` |
| `get_fon_portfoy` | `fon_kodu` | `{dagilim: [{kategori, oran}, ...]}` |
| `ara_fon` | `metin, limit` | `[{fon_kodu, fon_adi}, ...]` |

**Client:** `src/services/tefasService.ts`
```typescript
const BASE_URL = "http://localhost:3000";
// On Hetzner: "https://bridge.yourdomain.com"
```

---

## 💰 Stopaj (Vergi) Sistemi

**Kural:** 10% withholding tax on capital gains (only if profit > 0)

```
Satış Değeri = 100 TL  →  Kardaki getiri = 20 TL
Stopaj = 20 TL × 10% = 2 TL
```

**Muafiyet:** Some funds (HSSYFs like LPH, RIB) are exempt.
- User long-presses fund card → toggle exempt status
- Stored in `stopaj_muaf_fonlar` table
- Checked in `usePortfolyo()` hook

---

## 🛠️ Setup & Development

### **1. Prerequisites**
```bash
# Install Node.js 18+
node --version  # v18.0.0+

# Install Watchman
brew install watchman  # macOS

# Install EAS CLI (for deployment later)
npm install -g eas-cli
```

### **2. Project Setup**
```bash
cd ~/tefas  # Use home folder, not Desktop/Claude (iCloud sync issues)
npm install --legacy-peer-deps
```

### **3. Start Development**
```bash
# Terminal 1: Start Metro bundler
npm start

# Terminal 2: Start HTTP bridge (in another terminal, same directory)
python3 http_bridge.py
# Output: "✅ TEFAS HTTP Köprüsü hazır → http://localhost:3000"

# Terminal 3: Open in Expo Go app
# Scan QR code or press 'w' for web
```

### **4. Build for iOS (Simulator)**
```bash
npm run ios
# or press 'i' in Metro bundler
```

---

## 🚀 Deployment Path (In Progress)

### **Phase 1: Hetzner Bridge** (Next)
- Migrate `http_bridge.py` to Hetzner server
- Update `tefasService.ts`: `localhost:3000` → `https://bridge.yourdomain.com`
- Run bridge in Docker container on Hetzner
- Result: App works from anywhere (not just Turkey)

### **Phase 2: EAS + TestFlight** (After Apple Dev Account)
- Setup Apple Developer Account ($99/year)
- Configure `app.json` for EAS Build
- Create GitHub Actions workflow
- Auto-deploy on every git push
- Distribute via TestFlight
- Result: PC-independent releases

---

## 📝 Key Files to Know

| File | Purpose | Notes |
|------|---------|-------|
| `src/hooks/usePortfolyo.ts` | Portfolio calculations | FIFO, total gains, stopaj logic |
| `src/services/database.ts` | SQLite migrations | Add/modify tables here |
| `src/services/islemService.ts` | Transaction CRUD | Buy/sell operations |
| `src/services/tefasService.ts` | API client | Calls http_bridge.py |
| `app/(tabs)/index.tsx` | Home screen | Portfolio overview + fund list |
| `http_bridge.py` | HTTP server | TEFAS API gateway |

---

## 🔄 Common Tasks

### Add a New Fund Field
1. Migrate DB: `src/services/database.ts` → add column
2. Update type: `src/types/index.ts`
3. Query: `src/services/islemService.ts`
4. Display: `app/(tabs)/index.tsx`

### Fix API Issue
1. Check bridge logs: `python3 http_bridge.py` (local terminal)
2. Inspect request: `src/services/tefasService.ts` (method call)
3. Test tool manually in `http_bridge.py` `_dispatch()`

### Deploy to Hetzner (Later)
1. SSH into server
2. Clone repo, install Python deps
3. Run bridge in Docker + systemd
4. Point app to Hetzner URL

---

## 📊 Git Workflow

```bash
# Latest commits
git log --oneline | head -20

# Current branch
git branch

# Push changes
git add .
git commit -m "feat: stopaj muafiyet sistemi eklendi"
git push origin main
```

**Main branch:** Production-ready code

---

## ⚠️ Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Metro timeout (100+ sec) | Watchman + iCloud sync | Removed Watchman; use home dir |
| `node_modules` corruption | Large path + permission issues | Clean install in `~/tefas` |
| "duplicate column" error | Migration race condition | Try-catch wrapper in migrations |
| TEFAS API geo-blocked | API requires Turkey IP | Hetzner bridge (in progress) |

---

## 📚 References

- **TEFAS Documentation:** (Internal fonlar-mcp module)
- **Expo Docs:** https://docs.expo.dev
- **React Native:** https://reactnative.dev
- **SQLite Expo:** https://docs.expo.dev/versions/latest/sdk/sqlite/
- **GitHub:** https://github.com/kozyalcin/tefas-portfolio

---

## 🎯 Next Steps

1. ✅ Core portfolio tracking — **DONE**
2. ✅ Stopaj calculation + exemptions — **DONE**
3. ⏳ Hetzner HTTP bridge migration — **IN PROGRESS**
4. ⏳ EAS Build + TestFlight (needs Apple Dev account)
5. ⏳ Auto-deploy CI/CD via GitHub Actions

---

**Last Updated:** 2026-05-20
**Main Contact:** kozyalcin@gmail.com
