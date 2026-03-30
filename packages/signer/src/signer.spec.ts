import { createPublicKey, generateKeyPairSync, verify as cryptoVerify } from 'crypto';
import {
  assertValidSignedPriceProof,
  serializeProofPayload,
  signPriceData,
  SignedPriceProofVerificationError,
  verifySignedPriceProof,
} from './signer';
import { PriceData, SignedPriceProof } from './types';

describe('signer', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }) as string;

  const samplePriceData: PriceData = {
    symbol: 'AAPL',
    price: 189.42,
    timestamp: 1711459200000,
    source: 'aggregator',
  };

  it('signs and verifies a price proof using ed25519', () => {
    const proof = signPriceData(samplePriceData, {
      privateKey: privateKeyPem,
      algorithm: 'ed25519',
    });

    expect(proof.data).toEqual(samplePriceData);
    expect(proof.publicKey).toBe(publicKeyPem);
    expect(typeof proof.signature).toBe('string');
    expect(proof.signature.length).toBeGreaterThan(0);
    expect(Number.isInteger(proof.timestamp)).toBe(true);
    expect(verifySignedPriceProof(proof)).toBe(true);
    expect(() => assertValidSignedPriceProof(proof)).not.toThrow();
  });

  it('serializes the signed payload with a stable JSON structure', () => {
    const proof: SignedPriceProof = {
      data: samplePriceData,
      publicKey: publicKeyPem,
      signature: 'unused',
      timestamp: 1711459200123,
    };

    expect(serializeProofPayload(proof)).toBe(
      JSON.stringify({
        data: {
          symbol: 'AAPL',
          price: 189.42,
          timestamp: 1711459200000,
          source: 'aggregator',
        },
        publicKey: publicKeyPem,
        timestamp: 1711459200123,
      }),
    );
  });

  it('fails verification when the signed payload is tampered with', () => {
    const proof = signPriceData(samplePriceData, { privateKey: privateKeyPem });
    const tamperedProof: SignedPriceProof = {
      ...proof,
      data: {
        ...proof.data,
        price: proof.data.price + 1,
      },
    };

    expect(verifySignedPriceProof(tamperedProof)).toBe(false);
    expect(() => assertValidSignedPriceProof(tamperedProof)).toThrow(
      /signature verification failed/i,
    );
  });

  it('fails verification when the signature is invalid', () => {
    const proof = signPriceData(samplePriceData, { privateKey: privateKeyPem });
    const invalidSignatureProof: SignedPriceProof = {
      ...proof,
      signature: Buffer.from('definitely-not-a-valid-signature').toString('base64'),
    };

    expect(verifySignedPriceProof(invalidSignatureProof)).toBe(false);
    expect(() => assertValidSignedPriceProof(invalidSignatureProof)).toThrow(
      /signature verification failed/i,
    );
  });

  it('fails verification when a different public key is supplied', () => {
    const proof = signPriceData(samplePriceData, { privateKey: privateKeyPem });
    const otherKeys = generateKeyPairSync('ed25519');
    const otherPublicKeyPem = otherKeys.publicKey.export({
      format: 'pem',
      type: 'spki',
    }) as string;

    expect(
      verifySignedPriceProof(proof, {
        publicKey: otherPublicKeyPem,
      }),
    ).toBe(false);
  });

  it('throws a clear error for malformed public key material', () => {
    const proof = signPriceData(samplePriceData, { privateKey: privateKeyPem });

    expect(() =>
      assertValidSignedPriceProof(proof, {
        publicKey: 'not-a-pem-key',
      }),
    ).toThrow(/invalid public key material/i);
  });

  it('supports signing with a KeyObject private key', () => {
    const proof = signPriceData(samplePriceData, {
      privateKey,
    });

    expect(verifySignedPriceProof(proof, { publicKey })).toBe(true);
  });

  it('matches Node crypto verification for the canonical payload', () => {
    const proof = signPriceData(samplePriceData, {
      privateKey: privateKeyPem,
    });

    const isValid = cryptoVerify(
      null,
      Buffer.from(serializeProofPayload(proof)),
      publicKey,
      Buffer.from(proof.signature, 'base64'),
    );

    expect(
      verifySignedPriceProof(proof, {
        publicKey: createPublicKey(publicKeyPem),
      }),
    ).toBe(true);
    expect(isValid).toBe(true);
  });

  it('returns false while the assert helper throws on unsupported algorithms', () => {
    const proof = signPriceData(samplePriceData, { privateKey: privateKeyPem });

    expect(
      verifySignedPriceProof(proof, {
        algorithm: 'ed25519',
      }),
    ).toBe(true);

    expect(() =>
      assertValidSignedPriceProof(proof, {
        algorithm: 'rsa' as never,
      }),
    ).toThrow(SignedPriceProofVerificationError);
  });
});
