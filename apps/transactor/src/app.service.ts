import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProofIngestionService } from './services/proof-ingestion.service';
import { StellarSubmissionService } from './services/stellar-submission.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly proofIngestionService: ProofIngestionService,
    private readonly stellarSubmissionService: StellarSubmissionService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Validate Stellar configuration
    const configValidation = this.stellarSubmissionService.validateConfig();
    if (!configValidation.valid) {
      console.error('Stellar configuration validation failed:', configValidation.errors);
      return;
    }

    // Start polling if SIGNER_URL is configured
    const signerUrl = this.configService.get<string>('SIGNER_URL');
    if (signerUrl) {
      const pollInterval = this.configService.get<number>('POLL_INTERVAL_MS', 30000);
      this.proofIngestionService.startPolling(pollInterval);
    } else {
      console.log('No SIGNER_URL configured - running in HTTP endpoint mode only');
    }
  }

  getStatus(): { status: string; timestamp: number } {
    return {
      status: 'ready',
      timestamp: Date.now(),
    };
  }

  getConfigurationStatus(): {
    stellarConfigured: boolean;
    pollingEnabled: boolean;
    errors: string[];
  } {
    const stellarValidation = this.stellarSubmissionService.validateConfig();
    const signerUrl = this.configService.get<string>('SIGNER_URL');
    
    return {
      stellarConfigured: stellarValidation.valid,
      pollingEnabled: !!signerUrl,
      errors: stellarValidation.errors,
    };
  }
}
