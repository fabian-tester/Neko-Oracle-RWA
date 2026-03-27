import { Test, TestingModule } from '@nestjs/testing';
import { SignatureVerificationService } from './signature-verification.service';
import { SignedPriceProofDto } from '../dto/proof.dto';

describe('SignatureVerificationService', () => {
  let service: SignatureVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureVerificationService],
    }).compile();

    service = module.get<SignatureVerificationService>(SignatureVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateProof', () => {
    it('should validate a recent proof', () => {
      const now = Date.now();
      const proof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: now,
          source: 'test',
        },
        signature: 'test-signature',
        publicKey: 'test-public-key',
        timestamp: now,
      };

      const result = service.validateProof(proof);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an old proof', () => {
      const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      const proof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: oldTimestamp,
        },
        signature: 'test-signature',
        publicKey: 'test-public-key',
        timestamp: oldTimestamp,
      };

      const result = service.validateProof(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proof is too old (must be within 5 minutes)');
    });

    it('should reject a proof with future timestamp', () => {
      const futureTimestamp = Date.now() + 60000; // 1 minute in future
      const proof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: futureTimestamp,
        },
        signature: 'test-signature',
        publicKey: 'test-public-key',
        timestamp: futureTimestamp,
      };

      const result = service.validateProof(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proof timestamp is in the future');
    });

    it('should reject a proof with mismatched timestamps', () => {
      const now = Date.now();
      const proof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: now - 1000, // Different timestamp
        },
        signature: 'test-signature',
        publicKey: 'test-public-key',
        timestamp: now,
      };

      const result = service.validateProof(proof);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data timestamp does not match proof timestamp');
    });
  });

  describe('verifySignature', () => {
    it('should handle signature verification gracefully with invalid data', () => {
      const invalidProof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: Date.now(),
        },
        signature: 'dGVzdA==', // Valid base64 but invalid signature
        publicKey: 'dGVzdA==', // Valid base64 but invalid key
        timestamp: Date.now(),
      };

      // Should not throw an exception
      const result = service.verifySignature(invalidProof);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for malformed signature', () => {
      const proof: SignedPriceProofDto = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: Date.now(),
        },
        signature: 'not-base64-signature',
        publicKey: 'not-base64-public-key',
        timestamp: Date.now(),
      };

      const result = service.verifySignature(proof);
      expect(result).toBe(false);
    });
  });
});
