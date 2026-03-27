import { Controller, Get, Logger, NotFoundException, Param } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { PriceSnapshotsService, PriceSnapshot } from '../services/price-snapshots.service';

@Controller('prices')
export class PricesController {
  private readonly logger = new Logger(PricesController.name);

  constructor(
    private readonly priceFetcherService: PriceFetcherService,
    private readonly snapshots: PriceSnapshotsService,
  ) {}

  @Get('raw')
  async getRawPrices(): Promise<RawPrice[]> {
    this.logger.log('GET /prices/raw endpoint called');
    await this.priceFetcherService.fetchRawPrices();
    const rawPrices = this.priceFetcherService.getRawPrices();
    this.logger.log(`Returning ${rawPrices.length} raw prices`);
    return rawPrices;
  }

  @Get('latest/:symbol')
  async getLatest(@Param('symbol') symbol: string): Promise<PriceSnapshot> {
    let latest = this.snapshots.getLatest(symbol);
    if (!latest) {
      const prices = await this.priceFetcherService.fetchRawPrices();
      this.snapshots.ingest(prices);
      latest = this.snapshots.getLatest(symbol);
    }

    if (!latest) {
      throw new NotFoundException(`No snapshot available for symbol: ${symbol}`);
    }

    return latest;
  }

  @Get('historical/:symbol')
  async getHistorical(@Param('symbol') symbol: string): Promise<PriceSnapshot[]> {
    let historical = this.snapshots.getHistorical(symbol);
    if (historical.length === 0) {
      const prices = await this.priceFetcherService.fetchRawPrices();
      this.snapshots.ingest(prices);
      historical = this.snapshots.getHistorical(symbol);
    }
    return historical;
  }
}
