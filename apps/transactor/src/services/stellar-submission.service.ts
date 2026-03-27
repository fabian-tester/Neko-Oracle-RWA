import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarConfig, TransactionResult, RetryConfig } from '../interfaces/stellar.interface';
import { SignedPriceProofDto } from '../dto/proof.dto';

@Injectable()
export class StellarSubmissionService {
  private readonly logger = new Logger(StellarSubmissionService.name);
  private server: StellarSDK.Horizon.Server;
  private config: StellarConfig;
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  };

  constructor(private configService: ConfigService) {
    this.config = this.loadStellarConfig();
    this.server = new StellarSDK.Horizon.Server(this.config.rpcUrl);
  }

  /**
   * Submits a signed price proof to the Stellar oracle contract
   */
  async submitProof(proof: SignedPriceProofDto): Promise<TransactionResult> {
    try {
      this.logger.log(`Submitting proof for ${proof.data.symbol} at price ${proof.data.price}`);
      
      const account = await this.server.loadAccount(await this.getPublicKey());
      
      // Create the transaction to submit the proof to the oracle contract
      // Note: This is a simplified version for demonstration
      // In production, you would need proper Soroban contract invocation
      const transaction = new StellarSDK.TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(StellarSDK.Operation.payment({
          destination: this.config.contractId,
          asset: StellarSDK.Asset.native(),
          amount: '0.00001', // Minimum amount for smart contract interaction
        }))
        .addMemo(StellarSDK.Memo.text(`PROOF:${proof.data.symbol}:${proof.data.timestamp}`))
        .setTimeout(30)
        .build();

      // Sign the transaction
      transaction.sign(StellarSDK.Keypair.fromSecret(this.config.secretKey));

      // Submit with retry logic
      return await this.submitWithRetry(transaction);
    } catch (error) {
      this.logger.error('Failed to submit proof to Stellar:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submits transaction with exponential backoff retry
   */
  private async submitWithRetry(transaction: any): Promise<TransactionResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await this.server.submitTransaction(transaction);
        
        this.logger.log(`Transaction submitted successfully: ${result.hash}`);
        return {
          success: true,
          transactionId: result.hash,
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt} failed:`, error.message);

        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError.message,
    };
  }

  /**
   * Determines if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = ['tx_failed', 'op_bad_auth', 'tx_bad_seq'];
    return nonRetryableCodes.some(code => error.code === code);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the public key from the secret key
   */
  private async getPublicKey(): Promise<string> {
    const keypair = StellarSDK.Keypair.fromSecret(this.config.secretKey);
    return keypair.publicKey();
  }

  /**
   * Gets the network passphrase based on the configured network
   */
  private getNetworkPassphrase(): string {
    switch (this.config.network) {
      case 'testnet':
        return 'Test SDF Network ; September 2015';
      case 'public':
        return 'Public Global Stellar Network ; September 2015';
      case 'future':
        return 'Test SDF Future Network ; October 2022';
      default:
        throw new Error(`Unsupported network: ${this.config.network}`);
    }
  }

  /**
   * Loads Stellar configuration from environment variables
   */
  private loadStellarConfig(): StellarConfig {
    return {
      network: this.configService.get<string>('STELLAR_NETWORK', 'testnet') as any,
      rpcUrl: this.configService.get<string>('STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org'),
      contractId: this.configService.get<string>('ORACLE_CONTRACT_ID', ''),
      secretKey: this.configService.get<string>('STELLAR_SECRET_KEY', ''),
    };
  }

  /**
   * Validates the Stellar configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.contractId) {
      errors.push('ORACLE_CONTRACT_ID is required');
    }

    if (!this.config.secretKey) {
      errors.push('STELLAR_SECRET_KEY is required');
    }

    if (!this.config.rpcUrl) {
      errors.push('STELLAR_RPC_URL is required');
    }

    try {
      StellarSDK.Keypair.fromSecret(this.config.secretKey);
    } catch (error) {
      errors.push('Invalid STELLAR_SECRET_KEY format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
