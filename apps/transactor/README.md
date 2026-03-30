# Transactor Service

Submits signed stock price data to the Stellar network oracle contract.

## Overview

The transactor service is responsible for:
- Receiving signed price data from the signer service
- Validating cryptographic signatures and proof structure
- Submitting transactions to the Stellar oracle smart contract
- Managing transaction retries and error handling
- Providing both REST API and polling mechanisms for proof ingestion

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Access to a Stellar oracle contract (deployed on testnet or public network)
- Stellar account with sufficient funds for transaction fees

### Installation

Install dependencies:

```bash
npm install
```

### Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your Stellar network configuration and credentials:

#### Required Configuration

```bash
# Server Configuration
PORT=3003

# Stellar Network Configuration
STELLAR_NETWORK=testnet  # Options: testnet, public, future
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
ORACLE_CONTRACT_ID=your_deployed_oracle_contract_id
STELLAR_SECRET_KEY=your_stellar_secret_key_with_sufficient_balance
```

#### Optional Configuration

```bash
# Signer Service Configuration (for polling mode)
SIGNER_URL=http://localhost:3004  # URL of the signer service
POLL_INTERVAL_MS=30000           # Polling interval in milliseconds

# Retry Configuration
MAX_RETRY_ATTEMPTS=3              # Maximum retry attempts for failed transactions
BASE_RETRY_DELAY_MS=1000          # Base delay for exponential backoff
MAX_RETRY_DELAY_MS=10000          # Maximum delay between retries
```

### Running the Service

#### Development Mode

```bash
npm run start:dev
```

The service will start on `http://localhost:3003` (or the port specified in `.env`).

#### Production Mode

First, build the application:

```bash
npm run build
```

Then start the service:

```bash
npm start
```

## API Endpoints

### Health Check

```http
GET /
GET /health
```

Returns the service status and timestamp.

### Submit Signed Proof

```http
POST /proofs
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": {
    "symbol": "AAPL",
    "price": 150.25,
    "timestamp": 1640995200000,
    "source": "aggregator"
  },
  "signature": "base64_encoded_signature",
  "publicKey": "base64_encoded_public_key",
  "timestamp": 1640995200000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Proof submitted successfully to Stellar",
  "transactionId": "stellar_transaction_hash"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid cryptographic signature",
  "error": "detailed_error_message"
}
```

## Operation Modes

The transactor supports two operation modes:

### 1. REST API Mode (Default)

- Service listens for HTTP POST requests to `/proofs`
- Suitable for direct integration with other services
- Provides immediate feedback on submission status

### 2. Polling Mode (Optional)

- If `SIGNER_URL` is configured, service will automatically poll the signer service
- Polls at the interval specified by `POLL_INTERVAL_MS`
- Automatically processes any new signed proofs found
- Useful for automated pipeline integration

Both modes can operate simultaneously.

## Proof Validation

The service performs comprehensive validation of submitted proofs:

### Structural Validation
- Proof timestamp must be within 5 minutes of current time
- Proof timestamp cannot be in the future
- Data timestamp must match proof timestamp

### Cryptographic Validation
- Verifies the digital signature using the provided public key
- Ensures the signature matches the price data content
- Rejects proofs with invalid or malformed signatures

## Stellar Transaction Submission

The service handles the complete transaction submission process:

### Transaction Construction
- Creates Stellar transaction with `submit_price_proof` contract invocation
- Includes all required parameters: symbol, price, timestamp, signature, and public key
- Sets appropriate transaction fees and timeout

### Retry Logic
- Implements exponential backoff for transient network errors
- Retries up to `MAX_RETRY_ATTEMPTS` times
- Skips retries for non-retryable errors (e.g., authentication failures)

### Error Handling
- Categorizes errors to determine retry eligibility
- Provides detailed error messages for debugging
- Logs all submission attempts and outcomes

## Testing

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

### Test Coverage

The test suite includes:
- Unit tests for all service classes
- Mocked Stellar SDK interactions
- Signature verification scenarios
- Error handling and retry logic
- API endpoint validation

### Linting

Check code style:

```bash
npm run lint
```

## Project Structure

```
apps/transactor/
├── src/
│   ├── controllers/
│   │   ├── app.controller.ts       # Health check endpoints
│   │   └── proof.controller.ts    # Proof submission endpoints
│   ├── services/
│   │   ├── signature-verification.service.ts  # Cryptographic validation
│   │   ├── stellar-submission.service.ts      # Stellar transaction handling
│   │   └── proof-ingestion.service.ts         # Main orchestration logic
│   ├── dto/
│   │   └── proof.dto.ts          # Data transfer objects
│   ├── interfaces/
│   │   └── stellar.interface.ts  # Type definitions
│   ├── app.module.ts             # Root module
│   ├── app.service.ts            # Main service and initialization
│   └── main.ts                   # Application entry point
├── .env.example                  # Example environment variables
├── nest-cli.json                 # NestJS CLI configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Monitoring and Logging

The service provides comprehensive logging:
- Proof processing status and outcomes
- Stellar transaction submission attempts
- Configuration validation results
- Error details with stack traces

Log levels can be controlled through standard NestJS configuration.

## Security Considerations

- Stellar secret key should be kept secure and never committed to version control
- The service validates all input data before processing
- Cryptographic verification prevents tampered proofs from being submitted
- Consider running behind authentication in production environments

## Troubleshooting

### Common Issues

1. **"ORACLE_CONTRACT_ID is required"**
   - Ensure the oracle contract ID is set in your `.env` file

2. **"Invalid STELLAR_SECRET_KEY format"**
   - Verify your secret key is a valid Stellar secret key
   - Ensure the account has sufficient funds for transaction fees

3. **"Proof is too old"**
   - Ensure proofs are submitted within 5 minutes of signing
   - Check system time synchronization

4. **"Invalid cryptographic signature"**
   - Verify the signer and transactor are using compatible signature schemes
   - Check that the public key and signature are properly base64 encoded

### Debug Mode

Enable detailed logging by setting the log level to debug in your environment:

```bash
LOG_LEVEL=debug npm run start:dev
```

## Integration Examples

### Direct API Integration

```javascript
const proof = {
  data: { symbol: 'AAPL', price: 150.25, timestamp: Date.now() },
  signature: 'base64_signature',
  publicKey: 'base64_public_key',
  timestamp: Date.now()
};

const response = await fetch('http://localhost:3003/proofs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(proof)
});

const result = await response.json();
console.log('Submission result:', result);
```

### Service Status Check

```javascript
const response = await fetch('http://localhost:3003/health');
const status = await response.json();
console.log('Service status:', status);
```
