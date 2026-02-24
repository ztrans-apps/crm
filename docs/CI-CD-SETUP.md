# CI/CD Setup Documentation

## Overview
Automated testing and quality checks untuk Pull Requests ke branch `stable`.

## Files Created

### 1. GitHub Actions Workflows

#### `.github/workflows/pr-to-stable.yml`
Workflow khusus untuk PR ke stable branch dengan checks yang ketat:
- ✅ ESLint (code quality)
- ✅ TypeScript type checking
- ✅ All unit tests (294 tests)
- ✅ Build verification
- ✅ Security audit
- ✅ Secret scanning

**Trigger:** Setiap PR ke branch `stable`

#### `.github/workflows/ci.yml` (Updated)
Workflow untuk development branches (main, develop):
- Fixed dependency installation dengan `--legacy-peer-deps`
- Lint, test, dan build checks
- Docker image building

### 2. Configuration Files

#### `.npmrc`
```
legacy-peer-deps=true
engine-strict=false
```
Mengatasi peer dependency conflicts di CI/CD.

#### `.github/PULL_REQUEST_TEMPLATE.md`
Template standar untuk semua Pull Requests dengan checklist lengkap.

#### `.github/BRANCH_PROTECTION.md`
Dokumentasi lengkap tentang branch protection rules dan workflow.

## How It Works

### When You Create a PR to Stable:

1. **Automatic Trigger**
   - GitHub Actions automatically runs `pr-to-stable.yml`
   - Shows status in PR page

2. **Quality Checks Job**
   ```
   ✓ Checkout code
   ✓ Setup Node.js 20
   ✓ Install dependencies (with --legacy-peer-deps)
   ✓ Run ESLint
   ✓ Run TypeScript check
   ✓ Run all tests (294 tests)
   ✓ Build application
   ```

3. **Security Check Job**
   ```
   ✓ npm audit (check vulnerabilities)
   ✓ TruffleHog (scan for secrets)
   ```

4. **Approval Job**
   - Only runs if all checks pass
   - Shows summary of passed checks

### Status Indicators

In your PR, you'll see:
- 🟢 Green checkmark = All checks passed
- 🔴 Red X = Some checks failed
- 🟡 Yellow dot = Checks in progress

## Local Testing Before PR

Sebelum membuat PR, jalankan commands ini:

```bash
# 1. Install dependencies
npm ci --legacy-peer-deps

# 2. Run linter
npm run lint

# 3. Type check
npx tsc --noEmit

# 4. Run all tests
npm test -- --run

# 5. Build
npm run build
```

Jika semua berhasil lokal, kemungkinan besar CI juga akan pass.

## Fixing CI Failures

### Dependency Issues
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm ci --legacy-peer-deps
```

### Lint Errors
```bash
npm run lint
# Fix reported issues
```

### Type Errors
```bash
npx tsc --noEmit
# Fix TypeScript errors
```

### Test Failures
```bash
# Run specific test
npm test -- tests/path/to/test.test.ts

# Run all tests
npm test -- --run

# With coverage
npm run test:coverage
```

### Build Errors
```bash
rm -rf .next
npm run build
```

## GitHub Settings Required

### Branch Protection Rules for `stable`

Go to: Repository Settings → Branches → Add rule

**Branch name pattern:** `stable`

**Settings:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - **Required checks:**
    - `Quality Checks`
    - `Security Audit`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

### Secrets Configuration

Add these secrets in: Repository Settings → Secrets and variables → Actions

**Required secrets:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for tests)

## Workflow Diagram

```
Developer creates PR to stable
         ↓
GitHub Actions triggered
         ↓
    ┌────────────────────┐
    │  Quality Checks    │
    │  - Lint            │
    │  - Type Check      │
    │  - Tests (294)     │
    │  - Build           │
    └────────┬───────────┘
             │
    ┌────────┴───────────┐
    │  Security Audit    │
    │  - npm audit       │
    │  - Secret scan     │
    └────────┬───────────┘
             │
         All Pass?
         ↓       ↓
       Yes      No
         ↓       ↓
    ✅ Ready   ❌ Fix Issues
    to Merge   & Push Again
```

## Best Practices

1. **Always test locally first**
   - Saves CI/CD minutes
   - Faster feedback

2. **Keep PRs small**
   - Easier to review
   - Faster CI runs

3. **Write meaningful commit messages**
   - Helps reviewers understand changes

4. **Update tests**
   - Add tests for new features
   - Update tests for bug fixes

5. **Check CI logs**
   - If CI fails, read the logs
   - Fix issues before requesting review

## Monitoring

### View CI/CD Status
- Go to "Actions" tab in GitHub
- See all workflow runs
- Click on run to see detailed logs

### Notifications
- GitHub will notify you when:
  - CI starts
  - CI completes (pass/fail)
  - Review requested
  - PR approved/merged

## Troubleshooting Common Issues

### Issue: "npm ci" fails with ERESOLVE
**Solution:** Already fixed with `--legacy-peer-deps` in workflows

### Issue: Tests timeout
**Solution:** Increase timeout in `vitest.config.ts`

### Issue: Build fails with "Module not found"
**Solution:** Check imports and ensure all dependencies are in package.json

### Issue: TypeScript errors in CI but not locally
**Solution:** 
```bash
rm -rf node_modules .next
npm ci --legacy-peer-deps
npx tsc --noEmit
```

## Support

If you encounter issues:
1. Check this documentation
2. Check `.github/BRANCH_PROTECTION.md`
3. Review CI logs in GitHub Actions
4. Ask team for help

## Summary

✅ Automated quality checks untuk PR ke stable
✅ Dependency conflicts fixed dengan --legacy-peer-deps
✅ 294 tests running automatically
✅ Security scanning enabled
✅ Clear documentation dan templates
✅ Local testing commands provided

Sekarang setiap PR ke `stable` akan otomatis di-check sebelum bisa di-merge!
