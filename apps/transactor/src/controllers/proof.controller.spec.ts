import { Test, TestingModule } from '@nestjs/testing';
import { ProofController } from './proof.controller';
import { ProofIngestionService } from '../services/proof-ingestion.service';
import { SignedPriceProofDto } from '../dto/proof.dto';

describe('ProofController', () => {
  let controller: ProofController;
  let proofIngestionService: ProofIngestionService;

  beforeEach(async () => {
    const mockProofIngestionService = {
      processProof: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProofController],
      providers: [
        {
          provide: ProofIngestionService,
          useValue: mockProofIngestionService,
        },
      ],
    }).compile();

    controller = module.get<ProofController>(ProofController);
    proofIngestionService = module.get<ProofIngestionService>(ProofIngestionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should successfully submit a valid proof', async () => {
      jest.spyOn(proofIngestionService, 'processProof').mockResolvedValue({
        success: true,
        message: 'Proof submitted successfully',
        transactionId: 'TEST_TX_ID',
      });

      const result = await controller.submitProof(mockProof);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Proof submitted successfully');
      expect(result.transactionId).toBe('TEST_TX_ID');
      expect(proofIngestionService.processProof).toHaveBeenCalledWith(mockProof);
    });

    it('should handle proof submission failure', async () => {
      jest.spyOn(proofIngestionService, 'processProof').mockResolvedValue({
        success: false,
        message: 'Invalid signature',
      });

      const result = await controller.submitProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid signature');
      expect(result.transactionId).toBeUndefined();
    });

    it('should handle internal server errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(proofIngestionService, 'processProof').mockRejectedValue(error);

      const result = await controller.submitProof(mockProof);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Internal server error');
      expect(result.error).toBe('Database connection failed');
    });
  });
});
