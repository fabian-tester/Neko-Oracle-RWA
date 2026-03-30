import {
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  verify,
} from 'crypto';
import {
  KeyMaterial,
  PriceData,
  SignedPriceProof,
  SignerAlgorithm,
  SignerConfig,
  VerifyProofOptions,
} from './types';

const DEFAULT_ALGORITHM: SignerAlgorithm = 'ed25519';

export class SignedPriceProofVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignedPriceProofVerificationError';
  }
}

export function signPriceData(
  data: PriceData,
  config: SignerConfig,
): SignedPriceProof {
  assertSupportedAlgorithm(config.algorithm);
  assertValidPriceData(data);

  const privateKey = normalizePrivateKey(config.privateKey);
  assertEd25519KeyType(privateKey, 'private');

  const publicKeyPem = createPublicKey(privateKey).export({
    format: 'pem',
    type: 'spki',
  }) as string;

  const proof: SignedPriceProof = {
    data: normalizePriceData(data),
    signature: '',
    publicKey: publicKeyPem,
    timestamp: Date.now(),
  };

  proof.signature = sign(null, Buffer.from(serializeProofPayload(proof)), privateKey).toString(
    'base64',
  );

  return proof;
}

export function verifySignedPriceProof(
  proof: SignedPriceProof,
  options: VerifyProofOptions = {},
): boolean {
  try {
    assertValidSignedPriceProof(proof, options);
    return true;
  } catch {
    return false;
  }
}

export function assertValidSignedPriceProof(
  proof: SignedPriceProof,
  options: VerifyProofOptions = {},
): void {
  assertSupportedAlgorithm(options.algorithm);
  assertPayloadShape(proof);

  if (!proof.signature || typeof proof.signature !== 'string') {
    throw new SignedPriceProofVerificationError(
      'Signed price proof signature must be a base64-encoded string.',
    );
  }

  const publicKeyMaterial = options.publicKey ?? proof.publicKey;
  if (!publicKeyMaterial) {
    throw new SignedPriceProofVerificationError(
      'A public key is required to verify a signed price proof.',
    );
  }

  const publicKey = normalizePublicKey(publicKeyMaterial);
  assertEd25519KeyType(publicKey, 'public');

  const signature = decodeBase64Signature(proof.signature);
  const isValid = verify(
    null,
    Buffer.from(serializeProofPayload(proof)),
    publicKey,
    signature,
  );

  if (!isValid) {
    throw new SignedPriceProofVerificationError(
      'Signed price proof signature verification failed.',
    );
  }
}

export function serializeProofPayload(proof: SignedPriceProof): string {
  assertPayloadShape(proof);

  return JSON.stringify({
    data: normalizePriceData(proof.data),
    publicKey: proof.publicKey,
    timestamp: proof.timestamp,
  });
}

function normalizePrivateKey(privateKey: KeyMaterial): KeyObject {
  try {
    return privateKey instanceof KeyObject
      ? privateKey
      : createPrivateKey(privateKey);
  } catch (error) {
    throw new SignedPriceProofVerificationError(
      `Invalid PRIVATE_KEY value. Expected an ed25519 private key in PKCS#8 PEM or KeyObject format: ${formatErrorMessage(
        error,
      )}`,
    );
  }
}

function normalizePublicKey(publicKey: KeyMaterial): KeyObject {
  try {
    return publicKey instanceof KeyObject ? publicKey : createPublicKey(publicKey);
  } catch (error) {
    throw new SignedPriceProofVerificationError(
      `Invalid public key material. Expected an ed25519 public key in SPKI PEM or KeyObject format: ${formatErrorMessage(
        error,
      )}`,
    );
  }
}

function assertSupportedAlgorithm(algorithm?: string): void {
  if (algorithm && algorithm !== DEFAULT_ALGORITHM) {
    throw new SignedPriceProofVerificationError(
      `Unsupported signing algorithm "${algorithm}". Expected "${DEFAULT_ALGORITHM}".`,
    );
  }
}

function assertValidPriceData(data: PriceData): void {
  if (!data || typeof data !== 'object') {
    throw new SignedPriceProofVerificationError('Price data must be an object.');
  }

  if (!data.symbol || typeof data.symbol !== 'string') {
    throw new SignedPriceProofVerificationError('Price data symbol must be a non-empty string.');
  }

  if (!Number.isFinite(data.price)) {
    throw new SignedPriceProofVerificationError('Price data price must be a finite number.');
  }

  if (!Number.isInteger(data.timestamp)) {
    throw new SignedPriceProofVerificationError(
      'Price data timestamp must be an integer Unix timestamp in milliseconds.',
    );
  }

  if (data.source !== undefined && typeof data.source !== 'string') {
    throw new SignedPriceProofVerificationError(
      'Price data source must be a string when provided.',
    );
  }
}

function assertPayloadShape(proof: SignedPriceProof): void {
  if (!proof || typeof proof !== 'object') {
    throw new SignedPriceProofVerificationError('Signed price proof must be an object.');
  }

  assertValidPriceData(proof.data);

  if (!proof.publicKey || typeof proof.publicKey !== 'string') {
    throw new SignedPriceProofVerificationError(
      'Signed price proof publicKey must be a PEM-encoded string.',
    );
  }

  if (!Number.isInteger(proof.timestamp)) {
    throw new SignedPriceProofVerificationError(
      'Signed price proof timestamp must be an integer Unix timestamp in milliseconds.',
    );
  }
}

function normalizePriceData(data: PriceData): PriceData {
  const normalized: PriceData = {
    symbol: data.symbol,
    price: data.price,
    timestamp: data.timestamp,
  };

  if (data.source !== undefined) {
    normalized.source = data.source;
  }

  return normalized;
}

function decodeBase64Signature(signature: string): Buffer {
  try {
    const decoded = Buffer.from(signature, 'base64');
    if (decoded.length === 0) {
      throw new Error('empty signature');
    }

    return decoded;
  } catch (error) {
    throw new SignedPriceProofVerificationError(
      `Signed price proof signature is not valid base64: ${formatErrorMessage(error)}`,
    );
  }
}

function assertEd25519KeyType(key: KeyObject, kind: 'private' | 'public'): void {
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new SignedPriceProofVerificationError(
      `Expected an ed25519 ${kind} key but received "${key.asymmetricKeyType ?? 'unknown'}".`,
    );
  }
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
