import { KeyObject } from 'crypto';

/**
 * Type definitions for the Signer package
 */

export type SignerAlgorithm = 'ed25519';
export type KeyMaterial = string | KeyObject;

/**
 * Represents aggregated stock price data that will be signed
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source?: string;
}

/**
 * Represents a signed price proof
 */
export interface SignedPriceProof {
  data: PriceData;
  signature: string;
  publicKey: string;
  timestamp: number;
}

/**
 * Configuration options for signing
 */
export interface SignerConfig {
  privateKey: KeyMaterial;
  algorithm?: SignerAlgorithm;
}

/**
 * Configuration options for verification
 */
export interface VerifyProofOptions {
  publicKey?: KeyMaterial;
  algorithm?: SignerAlgorithm;
}
