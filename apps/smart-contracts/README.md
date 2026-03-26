# Smart Contracts Demo

This directory contains the SEP-40 compliant Soroban Oracle smart contract for Stellar RWA price feeds.

## Overview

This is a Soroban Rust smart contract that provides:

- SEP-40 compliant oracle interface
- Price feed storage and retrieval
- ed25519 signature verification for signed price proofs
- Access control and authorization
- Event emissions for price updates

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Signer     │────▶│ Transactor  │────▶│  Oracle Contract    │
│  (packages/  │     │  (apps/     │     │  (apps/smart-       │
│   signer)    │     │  transactor)│     │   contracts)        │
└─────────────┘     └─────────────┘     └─────────────────────┘
     Signs            Submits            Stores & verifies
   price data       transactions         signed prices
```

## Data Flow

1. **Signer** (`packages/signer`): Aggregates price data and creates ed25519 signed proofs
2. **Transactor** (`apps/transactor`): Submits signed transactions to the oracle contract
3. **Oracle Contract** (`apps/smart-contracts`): Stores verified prices and serves consumer requests

## Prerequisites

- Rust 1.70+ with `wasm32-unknown-unknown` target
- Stellar Soroban CLI (`stellar contract`)

### Install Rust and WASM target

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --crate-type bin --git https://github.com/stellar/rs-soroban-sdk --tag v20.0.0 stellar_contract
```

## Build

```bash
# Build the WASM contract
cd apps/smart-contracts
cargo build --target wasm32-unknown-unknown --release

# The WASM file will be at:
# target/wasm32-unknown-unknown/release/neko_oracle.wasm
```

## Test

```bash
cd apps/smart-contracts

# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_update_and_get_price
```

## Contract Interface

### Initialization

```rust
// Initialize the contract with an admin address
fn init(env: Env, admin: Address)
```

### Price Management

```rust
// Update price with signed proof
fn update_price(
    env: Env,
    public_key: BytesN<32>,    // Signer's public key
    data: PriceData,           // Price data to verify
    signature: BytesN<64>     // ed25519 signature
) -> Result<(), ContractError>

// Get price for a symbol
fn get_price(env: Env, symbol: Symbol) -> Option<PriceData>

// Get all prices
fn prices(env: Env) -> Vec<PriceData>
```

### Admin Functions

```rust
// Change admin (requires existing admin)
fn set_admin(env: Env, new_admin: Address) -> Result<(), ContractError>

// Set authorized signer public key
fn set_signer_pubkey(env: Env, pubkey: BytesN<32>) -> Result<(), ContractError>
```

## PriceData Structure

```rust
struct PriceData {
    symbol: Symbol,      // e.g., "AAPL", "GOOGL"
    price: i64,          // Price with 9 decimal precision
    timestamp: i64,      // Unix timestamp
    source: Option<Symbol>, // Data source identifier
}
```

## Signature Verification

The contract verifies ed25519 signatures using the Stellar SDK's built-in verification:

```rust
env.verify_sig_ed25519(payload, public_key, signature)
```

The payload is constructed from the PriceData fields.

## Deploy

```bash
# Deploy to testnet
stellar contract deploy \
  --source S... \
  --network testnet \
  --wasm target/wasm32-unknown-unknown/release/neko_oracle.wasm

# Initialize the contract
stellar contract invoke \
  --source S... \
  --network testnet \
  --id <CONTRACT_ID> \
  -- \
  init \
  --admin G...
```

## Example Usage Flow

### 1. Set up the signer public key

```bash
stellar contract invoke \
  --source ADMIN \
  --network testnet \
  --id <CONTRACT_ID> \
  -- \
  set_signer_pubkey \
  --pubkey <SIGNER_PUBLIC_KEY>
```

### 2. Submit signed price update

```bash
stellar contract invoke \
  --source TRANSACTOR \
  --network testnet \
  --id <CONTRACT_ID> \
  -- \
  update_price \
  --public_key <PUBLIC_KEY> \
  --data '{"symbol":"AAPL","price":1500000000,"timestamp":1234567890,"source":"finnhub"}' \
  --signature <BASE64_SIGNATURE>
```

### 3. Read the price

```bash
stellar contract invoke \
  --source USER \
  --network testnet \
  --id <CONTRACT_ID> \
  -- \
  get_price \
  --symbol "AAPL"
```

## Running Tests

The contract includes comprehensive tests covering:

- **Initialization**: Contract setup and admin configuration
- **Valid Proofs**: Successful price updates with valid signatures
- **Invalid Proofs**: Rejection of tampered or invalid signatures
- **Unauthorized Actions**: Access control for admin functions
- **Price Retrieval**: Reading stored price data
- **Multiple Symbols**: Managing multiple price feeds

```bash
cargo test -- --nocapture
```

Example output:

```
running 10 tests
test contract::test::test_init ... ok
test contract::test::test_update_and_get_price ... ok
test contract::test::test_update_price_with_invalid_signature ... ok
test contract::test::test_unauthorized_admin_change ... ok
...
```

## Integration with Transactor

The transactor (`apps/transactor`) is designed to:

1. Fetch aggregated prices from the aggregator service
2. Construct `PriceData` structs
3. Request signatures from the signer service
4. Submit transactions to the oracle contract

Example integration:

```typescript
// In apps/transactor/src/oracle.service.ts
async function submitPrice(symbol: string, price: number) {
  const priceData = {
    symbol,
    price: Math.round(price * 1e9), // 9 decimal precision
    timestamp: Date.now(),
    source: "aggregator",
  };

  const signature = await signerService.signPriceData(priceData);

  await oracleContract.updatePrice({
    publicKey: signerService.publicKey,
    data: priceData,
    signature: signature.signature,
  });
}
```

## Security Considerations

1. **Signature Verification**: All price updates require valid ed25519 signatures
2. **Admin Access**: Sensitive operations require admin authorization
3. **Timestamp Validation**: Price data includes timestamps for freshness checks
4. **Public Key Validation**: Ensures only authorized signers can submit prices

## License

MIT
