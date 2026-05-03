import type { ParaBirimi } from '@/types';

export function formatTL(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatParaBirimi(value: number, pb: ParaBirimi): string {
  const currency = pb === 'TRY' ? 'TRY' : pb;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: pb === 'TRY' ? 2 : 4,
    maximumFractionDigits: pb === 'TRY' ? 2 : 4,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

export function formatAdet(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatTarih(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTarihKisa(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatFiyat(value: number, pb: ParaBirimi): string {
  const decimals = pb === 'TRY' ? 6 : 4;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function bugun(): string {
  return new Date().toISOString().split('T')[0];
}

export function tarihtenGun(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 86_400_000);
}

export function gunFarki(baslangic: string, bitis: string): number {
  return tarihtenGun(bitis) - tarihtenGun(baslangic);
}
