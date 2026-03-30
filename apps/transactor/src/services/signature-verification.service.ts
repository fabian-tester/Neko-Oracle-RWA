import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { SignedPriceProofDto } from '../dto/proof.dto';

@Injectable()
export class SignatureVerificationService {
  /**
   * Verifies the cryptographic signature of a signed price proof
   */
  verifySignature(proof: SignedPriceProofDto): boolean {
    try {
      const message = this.createMessageHash(proof.data);
      const publicKeyBuffer = Buffer.from(proof.publicKey, 'base64');
      const signatureBuffer = Buffer.from(proof.signature, 'base64');
      
      return crypto.verify(
        'sha256',
        message,
        {
          key: publicKeyBuffer,
          format: 'der',
          type: 'spki',
        },
        signatureBuffer
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Creates a cryptographic hash of the price data
   */
  private createMessageHash(priceData: any): Buffer {
    const messageString = JSON.stringify({
      symbol: priceData.symbol,
      price: priceData.price,
      timestamp: priceData.timestamp,
      source: priceData.source || '',
    });
    
    return crypto.createHash('sha256').update(messageString).digest();
  }

  /**
   * Validates the structure and basic validity of the proof
   */
  validateProof(proof: SignedPriceProofDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if proof is recent (within 5 minutes)
    const now = Date.now();
    const proofAge = now - proof.timestamp;
    if (proofAge > 5 * 60 * 1000) {
      errors.push('Proof is too old (must be within 5 minutes)');
    }

    // Check if timestamp is in the future
    if (proof.timestamp > now) {
      errors.push('Proof timestamp is in the future');
    }

    // Check data consistency
    if (proof.data.timestamp !== proof.timestamp) {
      errors.push('Data timestamp does not match proof timestamp');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
