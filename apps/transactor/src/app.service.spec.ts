import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { ProofIngestionService } from './services/proof-ingestion.service';
import { StellarSubmissionService } from './services/stellar-submission.service';

describe('AppService', () => {
  let service: AppService;
  let proofIngestionService: ProofIngestionService;
  let stellarSubmissionService: StellarSubmissionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ProofIngestionService,
          useValue: {
            startPolling: jest.fn(),
          },
        },
        {
          provide: StellarSubmissionService,
          useValue: {
            validateConfig: jest.fn().mockReturnValue({
              valid: true,
              errors: [],
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    proofIngestionService = module.get<ProofIngestionService>(ProofIngestionService);
    stellarSubmissionService = module.get<StellarSubmissionService>(StellarSubmissionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return status', () => {
    const status = service.getStatus();
    expect(status.status).toBe('ready');
    expect(status.timestamp).toBeGreaterThan(0);
  });

  it('should return configuration status', () => {
    const configStatus = service.getConfigurationStatus();
    expect(configStatus).toHaveProperty('stellarConfigured');
    expect(configStatus).toHaveProperty('pollingEnabled');
    expect(configStatus).toHaveProperty('errors');
  });
});
