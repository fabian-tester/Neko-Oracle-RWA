# Contributing to Neko Oracle RWA

Thank you for your interest in contributing! This guide explains how to set up the project locally, follow conventions, and submit high-quality contributions.

---

## 🚀 Development Setup

### Prerequisites

- Node.js >= 18
- npm or yarn
- Git

---

### Clone the Repository

```bash
git clone https://github.com/<your-username>/Neko-Oracle-RWA.git
cd Neko-Oracle-RWA
```

### Install Dependencies
```bash
npm install
```

### Run the Project
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Build
```bash
npm run build
```

### 🔍 Linting & Type Checking
```bash
npm run lint
npm run typecheck
```

## 📁 Project Structure

This repository follows a modular structure:
```text
apps/        # Application layers (frontend, backend services)
packages/    # Shared utilities, libraries, and logic
```

Guidelines
- Place app-specific logic inside `apps`
- Place reusable logic inside `packages/`
- Avoid duplication across apps


## Branch Naming Convention
```text
feat/feature-name
fix/bug-description
chore/task-name
docs/update-docs
test/add-tests
```
## 📝 Commit Message Convention
We use Conventional Commits:
```text
feat: add oracle price validation
fix: resolve API timeout issue
docs: update README setup steps
test: add unit tests for oracle service
```

## 🔁 Pull Request Guidelines
Link the issue:
 Closes `#<issue-number>`

- Keep PRs small and focused
- Include a clear description
- Add a test plan
- Ensure all checks pass

## Code Review Standards

### General
- Write clean, readable code
- Avoid unnecessary complexity

### TypeScript
- Avoid `any`
- Use strict typing

### Security
- Never commit secrets
- Validate all inputs

### Testing
Required for:
- New features
- Bug fixes
- Core logic changes 


## Before Submitting
 - Code builds successfully
 - Tests pass
 - Linting passes
 - No sensitive data exposed
 - PR description completed

Thank you for contributing! You are helping us make RWAs consumer friendly on Stellar.

