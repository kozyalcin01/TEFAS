#!/usr/bin/env python3
"""
TEFAS HTTP Köprüsü — port 3000
Mobil uygulama bu sunucuya POST /mcp ile bağlanır,
sunucu TEFAS API'sini çağırıp sonucu döner.
"""

import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

# fonlar-mcp modülünü path'e ekle
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'fonlar-mcp', 'src'))
from fonlar_mcp import tefas_api as tefas

PERIYOD_MAP = {
    "hafta": tefas.PERIYOD_HAFTA,
    "1ay":   tefas.PERIYOD_1AY,
    "3ay":   tefas.PERIYOD_3AY,
    "6ay":   tefas.PERIYOD_6AY,
    "1yil":  tefas.PERIYOD_1YIL,
    "3yil":  tefas.PERIYOD_3YIL,
    "5yil":  tefas.PERIYOD_5YIL,
}


class MCPHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length) or b'{}')
        tool   = body.get('tool', '')
        params = body.get('params', {})

        try:
            result = self._dispatch(tool, params)
            self._respond(200, result)
        except Exception as e:
            print(f"[HATA] {tool}: {e}")
            self._respond(500, {"error": str(e)})

    def _dispatch(self, tool, params):
        # ── get_fon_fiyat ──────────────────────────────────────────────
        if tool == 'get_fon_fiyat':
            fon_kodu = params['fon_kodu']
            # En az 2 günlük veri için haftalık çek (tatil/hafta sonu toleranslı)
            rows = tefas.fon_fiyat_gecmisi(fon_kodu, tefas.PERIYOD_HAFTA)
            if not rows:
                rows = tefas.fon_fiyat_gecmisi(fon_kodu, tefas.PERIYOD_1AY)
            if len(rows) < 2:
                raise ValueError(f"{fon_kodu} için fiyat bulunamadı")
            son, onc = rows[-1], rows[-2]
            sf, of = son["fiyat"], onc["fiyat"]
            gunluk = round((sf / of - 1) * 100, 4) if of > 0 else 0
            return {
                "fon_kodu":             fon_kodu.upper(),
                "fon_adi":              son.get("fonUnvan") or fon_kodu.upper(),
                "fiyat":                sf,
                "gunluk_getiri_yuzde":  gunluk,
                "tarih":                son["tarih"],
            }

        # ── get_fon_fiyat_gecmisi ──────────────────────────────────────
        elif tool == 'get_fon_fiyat_gecmisi':
            fon_kodu = params['fon_kodu']
            periyod  = params.get('periyod', '1ay')
            p_int    = PERIYOD_MAP.get(periyod, tefas.PERIYOD_1AY)
            rows     = tefas.fon_fiyat_gecmisi(fon_kodu, p_int)
            return [{"tarih": r["tarih"], "fiyat": r["fiyat"]} for r in rows]

        # ── donemsel_getiri_ozeti ──────────────────────────────────────
        elif tool == 'donemsel_getiri_ozeti':
            fon_kodu = params['fon_kodu'].upper()
            rows = tefas.fonlar_donemsel_getiri()
            def pct(v):
                # TEFAS yüzde olarak döndürür (3.33 = %3.33) → ondalığa çevir
                return round(v / 100, 6) if v is not None else None
            for r in rows:
                if (r.get("fonKodu") or r.get("fonKod") or "").upper() == fon_kodu:
                    return {
                        "fon_kodu": fon_kodu,
                        "getiriler": {
                            "1ay":  pct(r.get("getiri1a")),
                            "3ay":  pct(r.get("getiri3a")),
                            "6ay":  pct(r.get("getiri6a")),
                            "yb":   pct(r.get("getiriyb")),
                            "1yil": pct(r.get("getiri1y")),
                            "3yil": pct(r.get("getiri3y")),
                            "5yil": pct(r.get("getiri5y")),
                        }
                    }
            raise ValueError(f"{fon_kodu} dönemsel getiri tablosunda yok")

        # ── get_fon_portfoy ────────────────────────────────────────────
        elif tool == 'get_fon_portfoy':
            fon_kodu = params['fon_kodu']
            # Son fiyat tarihini al (tatil/hafta sonu toleranslı)
            from datetime import datetime, timedelta
            satir = None
            for i in range(7):
                tarih = (datetime.now() - timedelta(days=i)).strftime('%Y%m%d')
                satir = tefas.fon_portfoy_dagilimi(fon_kodu, tarih)
                if satir:
                    break
            if not satir:
                return {"dagilim": []}
            normalize = tefas.portfoy_dagilimi_normalize(satir)
            return {
                "dagilim": [
                    {"kategori": k, "oran": round(v / 100, 6)}
                    for k, v in sorted(normalize.items(), key=lambda x: x[1], reverse=True)
                ]
            }

        # ── ara_fon ───────────────────────────────────────────────────
        elif tool == 'ara_fon':
            metin = params.get('metin', '')
            limit = int(params.get('limit', 10))
            rows  = tefas.fon_unvan_ara(metin)
            return [
                {
                    "fon_kodu": r.get("fonKodu") or r.get("fonKod"),
                    "fon_adi":  r.get("fonUnvan") or r.get("unvan"),
                }
                for r in rows[:limit]
            ]

        else:
            raise ValueError(f"Bilinmeyen tool: '{tool}'")

    def _respond(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} — {fmt % args}")


if __name__ == '__main__':
    port = 3000
    server = HTTPServer(('0.0.0.0', port), MCPHandler)
    print(f"✅ TEFAS HTTP Köprüsü hazır → http://localhost:{port}/mcp")
    print("   Durdurmak için Ctrl+C\n")
    server.serve_forever()
