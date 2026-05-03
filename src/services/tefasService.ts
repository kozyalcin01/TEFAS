import type { FonFiyat, FiyatNoktasi, DonemselGetiri, PortfoyDagilimKalem, Periyod } from '@/types';

const MCP_TIMEOUT_MS = 30000;

async function mcpCall<T>(tool: string, params: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch('http://192.168.68.100:3000/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Rate limit queue: maks 6 istek/dakika
class RequestQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private timestamps: number[] = [];

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await fn()); } catch (e) { reject(e); }
      });
      this.flush();
    });
  }

  private async flush() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= 6 || this.queue.length === 0) {
      if (this.timestamps.length >= 6) {
        const wait = 60_000 - (now - this.timestamps[0]) + 200;
        setTimeout(() => this.flush(), wait);
      }
      return;
    }
    const fn = this.queue.shift();
    if (!fn) return;
    this.timestamps.push(Date.now());
    await fn();
    this.flush();
  }
}

const queue = new RequestQueue();

export const tefasService = {
  async getFonFiyat(fonKodu: string): Promise<FonFiyat | null> {
    try {
      return await queue.enqueue(() =>
        mcpCall<FonFiyat>('get_fon_fiyat', { fon_kodu: fonKodu })
      );
    } catch {
      return null;
    }
  },

  async getFonGecmisi(fonKodu: string, periyod: Periyod): Promise<FiyatNoktasi[]> {
    try {
      return await queue.enqueue(() =>
        mcpCall<FiyatNoktasi[]>('get_fon_fiyat_gecmisi', {
          fon_kodu: fonKodu,
          periyod,
        })
      );
    } catch {
      return [];
    }
  },

  async getDonemselGetiri(fonKodu: string): Promise<DonemselGetiri | null> {
    try {
      return await queue.enqueue(() =>
        mcpCall<DonemselGetiri>('donemsel_getiri_ozeti', { fon_kodu: fonKodu })
      );
    } catch {
      return null;
    }
  },

  async getFonPortfoy(fonKodu: string): Promise<PortfoyDagilimKalem[]> {
    try {
      const res = await queue.enqueue(() =>
        mcpCall<{ dagilim: PortfoyDagilimKalem[] }>('get_fon_portfoy', {
          fon_kodu: fonKodu,
        })
      );
      return res.dagilim ?? [];
    } catch {
      return [];
    }
  },

  async araFon(metin: string, limit = 10): Promise<{ fon_kodu: string; fon_adi: string }[]> {
    try {
      return await queue.enqueue(() =>
        mcpCall<{ fon_kodu: string; fon_adi: string }[]>('ara_fon', { metin, limit })
      );
    } catch {
      return [];
    }
  },
};
