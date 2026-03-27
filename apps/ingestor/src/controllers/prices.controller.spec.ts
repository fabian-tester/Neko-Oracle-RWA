import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { PriceSnapshotsService } from '../services/price-snapshots.service';

describe('PricesController (snapshots)', () => {
  let controller: PricesController;
  let fetcher: jest.Mocked<PriceFetcherService>;
  let snapshots: PriceSnapshotsService;

  const rawPrices = [
    { symbol: 'AAPL', price: 150.25, timestamp: 1700000000000, source: 'MockProvider' },
    { symbol: 'GOOGL', price: 2800.5, timestamp: 1700000000123, source: 'MockProvider' },
  ];

  beforeEach(async () => {
    const mockFetcher = {
      fetchRawPrices: jest.fn().mockResolvedValue(rawPrices),
      getRawPrices: jest.fn().mockReturnValue(rawPrices),
      getSymbols: jest.fn().mockReturnValue(['AAPL', 'GOOGL']),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricesController],
      providers: [
        PriceSnapshotsService,
        { provide: PriceFetcherService, useValue: mockFetcher },
      ],
    }).compile();

    controller = module.get(PricesController);
    fetcher = module.get(PriceFetcherService);
    snapshots = module.get(PriceSnapshotsService);
  });

  it('GET /prices/latest/:symbol returns PriceInputDto-shaped snapshot with ISO timestamp', async () => {
    const result = await controller.getLatest('AAPL');
    expect(fetcher.fetchRawPrices).toHaveBeenCalled();
    expect(result).toEqual({
      symbol: 'AAPL',
      price: 150.25,
      source: 'MockProvider',
      timestamp: new Date(1700000000000).toISOString(),
    });
  });

  it('GET /prices/historical/:symbol returns an array of snapshots', async () => {
    const result = await controller.getHistorical('GOOGL');
    expect(fetcher.fetchRawPrices).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty('symbol');
    expect(result[0]).toHaveProperty('price');
    expect(result[0]).toHaveProperty('source');
    expect(result[0]).toHaveProperty('timestamp');
    expect(result[0].timestamp).toBe(new Date(1700000000123).toISOString());
  });

  it('GET /prices/latest/:symbol throws 404 when still empty after fetch', async () => {
    fetcher.fetchRawPrices.mockResolvedValueOnce([]);
    await expect(controller.getLatest('MISSING')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('symbol lookups are case-insensitive', async () => {
    snapshots.ingest([rawPrices[0] as any]);
    const latest = await controller.getLatest('aapl');
    expect(latest.symbol).toBe('AAPL');
  });
});

