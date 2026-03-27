import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ProofIngestionService } from './proof-ingestion.service';
import { SignatureVerificationService } from './signature-verification.service';
import { StellarSubmissionService } from './stellar-submission.service';
import { SignedPriceProofDto } from '../dto/proof.dto';
import { firstValueFrom, of } from 'rxjs';

describe('ProofIngestionService', () => {
  let service: ProofIngestionService;
  let signatureVerificationService: SignatureVerificationService;
  let stellarSubmissionService: StellarSubmissionService;
  let httpService: any;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ProofIngestionService,
        {
          provide: SignatureVerificationService,
          useValue: {
            validateProof: jest.fn(),
            verifySignature: jest.fn(),
          },
        },
        {
          provide: StellarSubmissionService,
          useValue: {
            submitProof: jest.fn(),
          },
        },
      ],
    })
      .overrideProvider('HttpService')
      .useValue(mockHttpService)
      .compile();

    service = module.get<ProofIngestionService>(ProofIngestionService);
    signatureVerificationService = module.get<SignatureVerificationService>(SignatureVerificationService);
    stellarSubmissionService = module.get<StellarSubmissionService>(StellarSubmissionService);
    httpService = module.get('HttpService');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processProof', () => {
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

    it('should process a valid proof successfully', async () => {
      jest.spyOn(signatureVerificationService, 'validateProof').mockReturnValue({
        valid: true,
        errors: [],
      });
      jest.spyOn(signatureVerificationService, 'verifySignature').mockReturnValue(true);
      jest.spyOn(stellarSubmissionService, 'submitProof').mockResolvedValue({
        success: true,
        transactionId: 'TEST_TX_ID',
      });

      const result = await service.processProof(mockProof);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('TEST_TX_ID');
      expect(signatureVerificationService.validateProof).toHaveBeenCalledWith(mockProof);
      expect(signatureVerificationService.verifySignature).toHaveBeenCalledWith(mockProof);
      expect(stellarSubmissionService.submitProof).toHaveBeenCalledWith(mockProof);
    });

    it('should reject invalid proof', async () => {
      jest.spyOn(signatureVerificationService, 'validateProof').mockReturnValue({
        valid: false,
        errors: ['Proof is too old'],
      });

      const result = await service.processProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid proof: Proof is too old');
      expect(signatureVerificationService.verifySignature).not.toHaveBeenCalled();
      expect(stellarSubmissionService.submitProof).not.toHaveBeenCalled();
    });

    it('should reject proof with invalid signature', async () => {
      jest.spyOn(signatureVerificationService, 'validateProof').mockReturnValue({
        valid: true,
        errors: [],
      });
      jest.spyOn(signatureVerificationService, 'verifySignature').mockReturnValue(false);

      const result = await service.processProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid cryptographic signature');
      expect(stellarSubmissionService.submitProof).not.toHaveBeenCalled();
    });

    it('should handle Stellar submission failure', async () => {
      jest.spyOn(signatureVerificationService, 'validateProof').mockReturnValue({
        valid: true,
        errors: [],
      });
      jest.spyOn(signatureVerificationService, 'verifySignature').mockReturnValue(true);
      jest.spyOn(stellarSubmissionService, 'submitProof').mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.processProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to submit to Stellar: Network error');
    });
  });

  describe('pollForProofs', () => {
    it('should poll and process found proofs', async () => {
      const mockProofs: SignedPriceProofDto[] = [
        {
          data: { symbol: 'AAPL', price: 150.25, timestamp: Date.now() },
          signature: 'sig1',
          publicKey: 'key1',
          timestamp: Date.now(),
        },
        {
          data: { symbol: 'GOOGL', price: 2500.50, timestamp: Date.now() },
          signature: 'sig2',
          publicKey: 'key2',
          timestamp: Date.now(),
        },
      ];

      httpService.get.mockReturnValue(of({ data: mockProofs }));

      jest.spyOn(service, 'processProof').mockResolvedValue({
        success: true,
        message: 'Success',
        transactionId: 'TX_ID',
      });

      await service.pollForProofs();

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3004/proofs',
        { timeout: 10000 }
      );
      expect(service.processProof).toHaveBeenCalledTimes(2);
    });

    it('should handle connection refused error gracefully', async () => {
      const connectionError = new Error('ECONNREFUSED') as any;
      connectionError.code = 'ECONNREFUSED';
      httpService.get.mockImplementation(() => {
        throw connectionError;
      });

      // Should not throw an exception
      await expect(service.pollForProofs()).resolves.toBeUndefined();
    });

    it('should handle other polling errors', async () => {
      httpService.get.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Should not throw an exception
      await expect(service.pollForProofs()).resolves.toBeUndefined();
    });
  });
});
