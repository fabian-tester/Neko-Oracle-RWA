import { Injectable } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';

export type PriceSnapshot = {
  symbol: string;
  price: number;
  source: string;
  timestamp: string; // ISO 8601
};

@Injectable()
export class PriceSnapshotsService {
  private readonly snapshotsBySymbol = new Map<string, PriceSnapshot[]>();
  private readonly maxSnapshotsPerSymbol = 500;

  ingest(rawPrices: RawPrice[]): PriceSnapshot[] {
    const normalized = rawPrices.map(p => this.normalize(p));

    for (const snap of normalized) {
      const key = snap.symbol.toUpperCase();
      const existing = this.snapshotsBySymbol.get(key) ?? [];
      existing.push(snap);

      if (existing.length > this.maxSnapshotsPerSymbol) {
        existing.splice(0, existing.length - this.maxSnapshotsPerSymbol);
      }

      this.snapshotsBySymbol.set(key, existing);
    }

    return normalized;
  }

  getLatest(symbol: string): PriceSnapshot | null {
    const key = symbol.toUpperCase();
    const list = this.snapshotsBySymbol.get(key);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  getHistorical(symbol: string): PriceSnapshot[] {
    const key = symbol.toUpperCase();
    return [...(this.snapshotsBySymbol.get(key) ?? [])];
  }

  private normalize(raw: RawPrice): PriceSnapshot {
    return {
      symbol: raw.symbol,
      price: raw.price,
      source: raw.source,
      timestamp: new Date(raw.timestamp).toISOString(),
    };
  }
}

