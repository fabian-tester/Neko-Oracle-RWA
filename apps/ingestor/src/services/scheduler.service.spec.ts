import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { PriceFetcherService } from './price-fetcher.service';
import { PriceSnapshotsService } from './price-snapshots.service';
import { PriceStreamService } from './price-stream.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let priceFetcherService: jest.Mocked<PriceFetcherService>;
  let configService: jest.Mocked<ConfigService>;
  let snapshots: jest.Mocked<PriceSnapshotsService>;
  let stream: jest.Mocked<PriceStreamService>;

  const mockPrices = [
    { symbol: 'AAPL', price: 150.25, timestamp: Date.now(), source: 'MockProvider' },
    { symbol: 'GOOGL', price: 2800.5, timestamp: Date.now(), source: 'MockProvider' },
  ];

  beforeEach(async () => {
    const mockPriceFetcherService = {
      fetchRawPrices: jest.fn().mockResolvedValue(mockPrices),
      getRawPrices: jest.fn().mockReturnValue(mockPrices),
      getSymbols: jest.fn().mockReturnValue(['AAPL', 'GOOGL']),
    };

    const mockSnapshots = {
      ingest: jest.fn().mockReturnValue([
        {
          symbol: 'AAPL',
          price: 150.25,
          source: 'MockProvider',
          timestamp: new Date(mockPrices[0].timestamp).toISOString(),
        },
      ]),
      getLatest: jest.fn(),
      getHistorical: jest.fn(),
    };

    const mockStream = {
      broadcastPrices: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          FETCH_INTERVAL_MS: 1000,
          STOCK_SYMBOLS: 'AAPL,GOOGL',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: PriceFetcherService, useValue: mockPriceFetcherService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PriceSnapshotsService, useValue: mockSnapshots },
        { provide: PriceStreamService, useValue: mockStream },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    priceFetcherService = module.get(PriceFetcherService);
    configService = module.get(ConfigService);
    snapshots = module.get(PriceSnapshotsService);
    stream = module.get(PriceStreamService);
  });

  afterEach(() => {
    service.stopScheduler();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should read fetch interval from config', () => {
      expect(configService.get).toHaveBeenCalledWith('FETCH_INTERVAL_MS', 60000);
      expect(service.getIntervalMs()).toBe(1000);
    });
  });

  describe('startScheduler', () => {
    it('should start the scheduler and execute fetch immediately', async () => {
      service.startScheduler();

      expect(service.isSchedulerRunning()).toBe(true);
      // Wait for immediate fetch
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(priceFetcherService.fetchRawPrices).toHaveBeenCalled();
      expect(snapshots.ingest).toHaveBeenCalled();
      expect(stream.broadcastPrices).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      service.startScheduler();
      const firstCallCount = priceFetcherService.fetchRawPrices.mock.calls.length;

      service.startScheduler();
      // Should not trigger another immediate fetch
      expect(priceFetcherService.fetchRawPrices.mock.calls.length).toBe(firstCallCount);
    });

    it('should execute periodic fetches', async () => {
      service.startScheduler();

      // Wait for initial fetch + one interval
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(priceFetcherService.fetchRawPrices.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(snapshots.ingest.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(stream.broadcastPrices.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('stopScheduler', () => {
    it('should stop the scheduler', () => {
      service.startScheduler();
      expect(service.isSchedulerRunning()).toBe(true);

      service.stopScheduler();
      expect(service.isSchedulerRunning()).toBe(false);
    });

    it('should handle stopping when not running', () => {
      expect(() => service.stopScheduler()).not.toThrow();
    });
  });

  describe('isSchedulerRunning', () => {
    it('should return false initially', () => {
      expect(service.isSchedulerRunning()).toBe(false);
    });

    it('should return true when running', () => {
      service.startScheduler();
      expect(service.isSchedulerRunning()).toBe(true);
    });
  });

  describe('getIntervalMs', () => {
    it('should return configured interval', () => {
      expect(service.getIntervalMs()).toBe(1000);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      priceFetcherService.fetchRawPrices.mockRejectedValueOnce(new Error('Fetch failed'));
      jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      service.startScheduler();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not throw, scheduler should still be running
      expect(service.isSchedulerRunning()).toBe(true);
    });
  });

  describe('onModuleInit', () => {
    it('should start scheduler on module init', () => {
      const startSpy = jest.spyOn(service, 'startScheduler');
      service.onModuleInit();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop scheduler on module destroy', () => {
      service.startScheduler();
      const stopSpy = jest.spyOn(service, 'stopScheduler');
      service.onModuleDestroy();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
