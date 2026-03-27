import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './controllers/app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getStatus: jest.fn().mockReturnValue({
              status: 'ready',
              timestamp: Date.now(),
            }),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  it('should return service status', () => {
    const result = appController.getStatus();
    expect(result.status).toBe('ready');
    expect(result.timestamp).toBeGreaterThan(0);
    expect(appService.getStatus).toHaveBeenCalled();
  });

  it('should return health check status', () => {
    const result = appController.getHealth();
    expect(result.status).toBe('ready');
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.service).toBe('transactor');
    expect(appService.getStatus).toHaveBeenCalled();
  });
});
