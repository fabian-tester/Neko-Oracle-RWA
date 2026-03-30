import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarSubmissionService } from './stellar-submission.service';
import { SignedPriceProofDto } from '../dto/proof.dto';
import * as StellarSDK from '@stellar/stellar-sdk';

// Mock the Stellar SDK
jest.mock('@stellar/stellar-sdk', () => ({
  TransactionBuilder: jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    addMemo: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      sign: jest.fn().mockReturnThis(),
    }),
  })),
  Keypair: {
    fromSecret: jest.fn().mockReturnValue({
      publicKey: jest.fn().mockReturnValue('TEST_PUBLIC_KEY'),
    }),
  },
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
    })),
  },
  Operation: {
    payment: jest.fn(),
  },
  Asset: {
    native: jest.fn(),
  },
  Memo: {
    text: jest.fn(),
  },
}));

describe('StellarSubmissionService', () => {
  let service: StellarSubmissionService;
  let configService: ConfigService;
  let mockServer: jest.Mocked<StellarSDK.Horizon.Server>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarSubmissionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'STELLAR_NETWORK': 'testnet',
                'STELLAR_RPC_URL': 'https://soroban-testnet.stellar.org',
                'ORACLE_CONTRACT_ID': 'TEST_CONTRACT_ID',
                'STELLAR_SECRET_KEY': 'TEST_SECRET_KEY',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarSubmissionService>(StellarSubmissionService);
    configService = module.get<ConfigService>(ConfigService);
    mockServer = (service as any).server;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const result = service.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with missing contract ID', () => {
      jest.spyOn(configService, 'get').mockReturnValue('');
      
      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ORACLE_CONTRACT_ID is required');
    });

    it('should reject configuration with invalid secret key', () => {
      jest.spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'STELLAR_SECRET_KEY') return 'INVALID_KEY';
          const config = {
            'STELLAR_NETWORK': 'testnet',
            'STELLAR_RPC_URL': 'https://soroban-testnet.stellar.org',
            'ORACLE_CONTRACT_ID': 'TEST_CONTRACT_ID',
          };
          return config[key] || defaultValue;
        });

      // Mock the Keypair.fromSecret to throw an error for invalid key
      const mockKeypair = (StellarSDK as any).Keypair;
      mockKeypair.fromSecret.mockImplementation(() => {
        throw new Error('Invalid secret key');
      });

      const result = service.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid STELLAR_SECRET_KEY format');
    });
  });

  describe('submitProof', () => {
    const mockProof: SignedPriceProofDto = {
      data: {
        symbol: 'AAPL',
        price: 150.25,
        timestamp: Date.now(),
        source: 'test',
      },
      signature: 'test-signature',
      publicKey: 'test-public-key',
      timestamp: Date.now(),
    };

    it('should submit proof successfully', async () => {
      const mockAccount = {
        id: 'TEST_ID',
        paging_token: 'TEST_TOKEN',
        account_id: 'TEST_ACCOUNT',
        sequence: '1',
        subentry_count: 0,
        last_modified_ledger: 1,
        thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 1 },
        flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
        balances: [],
        signers: [],
        data: {},
        options: {},
      } as any;
      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction.mockResolvedValue({
        ledger: 12345,
        successful: true,
        envelope_xdr: 'TEST_XDR',
        result_xdr: 'TEST_RESULT',
        result_meta_xdr: 'TEST_META',
        hash: 'TEST_TRANSACTION_HASH',
        paging_token: 'TEST_PAGING_TOKEN',
      } as any);

      const result = await service.submitProof(mockProof);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('TEST_TRANSACTION_HASH');
      expect(mockServer.loadAccount).toHaveBeenCalled();
      expect(mockServer.submitTransaction).toHaveBeenCalled();
    });

    it('should handle submission failure', async () => {
      const mockAccount = {
        id: 'TEST_ID',
        paging_token: 'TEST_TOKEN',
        account_id: 'TEST_ACCOUNT',
        sequence: '1',
        subentry_count: 0,
        last_modified_ledger: 1,
        thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 1 },
        flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
        balances: [],
        signers: [],
        data: {},
        options: {},
      } as any;
      mockServer.loadAccount.mockResolvedValue(mockAccount);
      mockServer.submitTransaction.mockRejectedValue(new Error('Network error'));

      const result = await service.submitProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle account loading failure', async () => {
      mockServer.loadAccount.mockRejectedValue(new Error('Account not found'));

      const result = await service.submitProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });
  });
});
