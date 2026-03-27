import { Module } from '@nestjs/common';
import { PricesController } from '../controllers/prices.controller';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { StockService } from '../services/stock.service';      
import { FinnhubAdapter } from '../providers/finnhub.adapter';
import { SchedulerService } from '../services/scheduler.service';
import { PriceSnapshotsService } from '../services/price-snapshots.service';
import { IngestorWsService } from '../websocket/ingestor-ws.service';
import { PriceStreamService } from '../services/price-stream.service';

@Module({
  controllers: [PricesController],
  providers: [
    PriceFetcherService, 
    StockService,        
    FinnhubAdapter,
    PriceSnapshotsService,
    IngestorWsService,
    PriceStreamService,
    SchedulerService,
  ],
  exports: [PriceFetcherService, StockService, SchedulerService, PriceSnapshotsService], 
})
export class PricesModule {}
