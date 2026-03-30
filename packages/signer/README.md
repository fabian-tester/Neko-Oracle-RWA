# Signer Package

Produces cryptographically signed proofs of aggregated stock prices.

## Overview

This package provides:
- Ed25519 signing for aggregated price payloads
- Stable proof serialization for downstream publishers/transactors
- Boolean and throwing verification utilities
- PEM-based key management support

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

Install dependencies:

```bash
npm install
```

### Building the Package

Build the TypeScript package:

```bash
npm run build
```

This will compile the TypeScript source files to JavaScript in the `dist/` directory.

### Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:cov
```

### Linting

Check code style:

```bash
npm run lint
```

## Usage

After building, import the package in your application:

```typescript
import {
  PriceData,
  assertValidSignedPriceProof,
  signPriceData,
  verifySignedPriceProof,
} from '@oracle-stocks/signer';
```

### Key Formats

`PRIVATE_KEY` should be an Ed25519 private key in PKCS#8 PEM format. Public keys should be Ed25519 SPKI PEM strings.

Example private key:

```pem
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJExampleReplaceWithRealKeyMaterialgQy7q5sVfM+9Lx
-----END PRIVATE KEY-----
```

Example public key:

```pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAExampleReplaceWithRealKeyMaterial5L8sQ0Rk0PvN8hQ=
-----END PUBLIC KEY-----
```

You can also pass Node.js `KeyObject` instances directly if your application already loads keys via `crypto`.

### Signing

```typescript
const priceData: PriceData = {
  symbol: 'AAPL',
  price: 189.42,
  timestamp: Date.now(),
  source: 'aggregator',
};

const proof = signPriceData(priceData, {
  privateKey: process.env.PRIVATE_KEY as string,
  algorithm: 'ed25519',
});

console.log(proof);
```

Returned proofs follow the `SignedPriceProof` interface exactly:

```json
{
  "data": {
    "symbol": "AAPL",
    "price": 189.42,
    "timestamp": 1711459200000,
    "source": "aggregator"
  },
  "signature": "<base64 signature>",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n",
  "timestamp": 1711459200123
}
```

The signature is generated over a stable JSON payload containing:
- `data`
- `publicKey`
- `timestamp`

### Verification

Use `verifySignedPriceProof` when you want a boolean result:

```typescript
const isValid = verifySignedPriceProof(proof);
```

Use `assertValidSignedPriceProof` when you want explicit errors:

```typescript
assertValidSignedPriceProof(proof);
```

You can also verify against externally supplied public key material instead of the embedded proof key:

```typescript
const isValid = verifySignedPriceProof(proof, {
  publicKey: process.env.SIGNER_PUBLIC_KEY as string,
  algorithm: 'ed25519',
});
```

## Project Structure

```
packages/signer/
├── src/
│   ├── index.ts       # Main entry point
│   ├── signer.ts      # Signing and verification implementation
│   ├── signer.spec.ts # Unit tests
│   └── types.ts       # Type definitions
├── dist/              # Compiled output (generated)
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── README.md         # This file
```
