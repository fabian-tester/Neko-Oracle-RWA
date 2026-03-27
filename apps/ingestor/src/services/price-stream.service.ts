import { Injectable } from '@nestjs/common';
import { IngestorWsService } from '../websocket/ingestor-ws.service';
import { PriceSnapshot } from './price-snapshots.service';

@Injectable()
export class PriceStreamService {
  constructor(private readonly ws: IngestorWsService) {}

  broadcastPrices(prices: PriceSnapshot[]): void {
    for (const p of prices) {
      this.ws.broadcastJson(p);
    }
  }
}

