import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PricesModule } from '../modules/prices.module';
import { SchedulerService } from '../services/scheduler.service';
import { IngestorWsService } from './ingestor-ws.service';
import { WebSocket } from 'ws';

describe('IngestorWsService (ws protocol)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PricesModule,
      ],
    })
      .overrideProvider(SchedulerService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        startScheduler: jest.fn(),
        stopScheduler: jest.fn(),
        isSchedulerRunning: jest.fn().mockReturnValue(false),
        getIntervalMs: jest.fn().mockReturnValue(0),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('broadcasts JSON messages with PriceInputDto shape', async () => {
    const wsService = app.get(IngestorWsService);
    const server: any = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? 0 : address.port;

    const payload = {
      symbol: 'ETH',
      price: 2500,
      source: 'binance',
      timestamp: new Date(1700000000000).toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://127.0.0.1:${port}`);

      client.on('open', () => {
        wsService.broadcastJson(payload);
      });

      client.on('message', data => {
        try {
          const parsed = JSON.parse(data.toString());
          expect(parsed).toEqual(payload);
          // timestamp must be ISO 8601 string (basic sanity)
          expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
          client.close();
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      client.on('error', err => reject(err));
    });
  });
});

