# Branch Protection Rules

## Stable Branch Protection

The `stable` branch is protected with the following rules:

### Required Status Checks
Before merging to `stable`, the following checks must pass:

1. **Quality Checks** (`.github/workflows/pr-to-stable.yml`)
   - ✅ ESLint (code quality)
   - ✅ TypeScript type checking
   - ✅ All unit tests (294 tests)
   - ✅ Build successful

2. **Security Audit**
   - ✅ npm audit (no high/critical vulnerabilities)
   - ✅ Secret scanning

### Merge Requirements
- ✅ All status checks must pass
- ✅ At least 1 approval from code owners
- ✅ No merge conflicts
- ✅ Branch must be up to date with stable

### How to Create a PR to Stable

1. **Ensure your branch is up to date:**
   ```bash
   git checkout your-feature-branch
   git fetch origin
   git rebase origin/stable
   ```

2. **Run tests locally:**
   ```bash
   npm test -- --run
   npm run lint
   npm run build
   ```

3. **Create Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Base: `stable` ← Compare: `your-feature-branch`
   - Fill in the PR template
   - Submit for review

4. **Wait for CI/CD:**
   - GitHub Actions will automatically run all checks
   - Fix any issues if checks fail
   - Request review from team members

5. **Merge:**
   - Once approved and all checks pass
   - Use "Squash and merge" for clean history
   - Delete branch after merge

## Workflow Files

### For PRs to Stable
- `.github/workflows/pr-to-stable.yml` - Comprehensive quality checks

### For Regular Development
- `.github/workflows/ci.yml` - CI for main/develop branches

## Local Testing Commands

Before creating a PR, run these commands locally:

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Run all tests
npm test -- --run

# Build application
npm run build
```

## Troubleshooting

### Dependency Issues
If you encounter dependency conflicts:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Test Failures
```bash
# Run specific test file
npm test -- tests/path/to/test.test.ts

# Run tests in watch mode
npm test

# Run with coverage
npm run test:coverage
```

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```
