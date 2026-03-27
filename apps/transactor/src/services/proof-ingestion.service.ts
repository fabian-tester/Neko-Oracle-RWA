import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SignedPriceProofDto } from '../dto/proof.dto';
import { SignatureVerificationService } from './signature-verification.service';
import { StellarSubmissionService } from './stellar-submission.service';

@Injectable()
export class ProofIngestionService {
  private readonly logger = new Logger(ProofIngestionService.name);
  private readonly signerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly signatureVerificationService: SignatureVerificationService,
    private readonly stellarSubmissionService: StellarSubmissionService,
  ) {
    this.signerUrl = process.env.SIGNER_URL || 'http://localhost:3004';
  }

  /**
   * Processes a submitted signed price proof
   */
  async processProof(proof: SignedPriceProofDto): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      this.logger.log(`Processing proof for ${proof.data.symbol}`);

      // Step 1: Validate proof structure and timing
      const validation = this.signatureVerificationService.validateProof(proof);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid proof: ${validation.errors.join(', ')}`,
        };
      }

      // Step 2: Verify cryptographic signature
      const isValidSignature = this.signatureVerificationService.verifySignature(proof);
      if (!isValidSignature) {
        return {
          success: false,
          message: 'Invalid cryptographic signature',
        };
      }

      // Step 3: Submit to Stellar
      const result = await this.stellarSubmissionService.submitProof(proof);
      
      if (result.success) {
        this.logger.log(`Successfully submitted proof for ${proof.data.symbol}. Transaction: ${result.transactionId}`);
        return {
          success: true,
          message: 'Proof submitted successfully to Stellar',
          transactionId: result.transactionId,
        };
      } else {
        this.logger.error(`Failed to submit proof: ${result.error}`);
        return {
          success: false,
          message: `Failed to submit to Stellar: ${result.error}`,
        };
      }
    } catch (error) {
      this.logger.error('Error processing proof:', error);
      return {
        success: false,
        message: `Internal error: ${error.message}`,
      };
    }
  }

  /**
   * Polls the signer service for new signed proofs
   */
  async pollForProofs(): Promise<void> {
    try {
      this.logger.log('Polling signer service for new proofs...');
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.signerUrl}/proofs`, {
          timeout: 10000,
        })
      );

      const proofs: SignedPriceProofDto[] = (response.data as any) || [];
      
      if (proofs.length > 0) {
        this.logger.log(`Found ${proofs.length} new proofs to process`);
        
        // Process each proof
        for (const proof of proofs) {
          await this.processProof(proof);
        }
      } else {
        this.logger.log('No new proofs found');
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('Signer service not available for polling');
      } else {
        this.logger.error('Error polling for proofs:', error);
      }
    }
  }

  /**
   * Starts the polling mechanism if configured
   */
  startPolling(intervalMs: number = 30000): void {
    if (!this.signerUrl) {
      this.logger.log('No SIGNER_URL configured, polling disabled');
      return;
    }

    this.logger.log(`Starting proof polling every ${intervalMs}ms`);
    
    setInterval(async () => {
      await this.pollForProofs();
    }, intervalMs);

    // Initial poll
    this.pollForProofs();
  }
}
