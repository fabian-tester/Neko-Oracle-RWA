export interface StellarConfig {
  network: 'testnet' | 'public' | 'future';
  rpcUrl: string;
  contractId: string;
  secretKey: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}
