#!/bin/bash

# Performance Testing Readiness Check
# Verifies that all prerequisites are in place for performance verification
#
# Task: 26.3 - Verify performance targets
# Requirements: 11.1, 11.2, 11.3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Performance Testing Readiness Check (Task 26.3)           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Function to check a requirement
check_requirement() {
    local name=$1
    local command=$2
    local required=$3
    
    echo -n "Checking ${name}... "
    
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗ FAILED${NC}"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
        else
            echo -e "${YELLOW}⚠ WARNING${NC}"
            CHECKS_WARNING=$((CHECKS_WARNING + 1))
        fi
        return 1
    fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "1. Prerequisites"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check k6
if check_requirement "k6 installation" "command -v k6" "true"; then
    K6_VERSION=$(k6 version | head -n 1)
    echo "   Version: ${K6_VERSION}"
else
    echo "   ${RED}Install k6: https://k6.io/docs/getting-started/installation/${NC}"
fi
echo ""

# Check Node.js
if check_requirement "Node.js installation" "command -v node" "true"; then
    NODE_VERSION=$(node --version)
    echo "   Version: ${NODE_VERSION}"
else
    echo "   ${RED}Install Node.js: https://nodejs.org/${NC}"
fi
echo ""

# Check Redis CLI
if check_requirement "Redis CLI" "command -v redis-cli" "false"; then
    REDIS_VERSION=$(redis-cli --version)
    echo "   Version: ${REDIS_VERSION}"
else
    echo "   ${YELLOW}Redis CLI not found. Cache hit rate verification will be skipped.${NC}"
    echo "   ${YELLOW}Install Redis: https://redis.io/download${NC}"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "2. Environment Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check BASE_URL
if [ -n "$BASE_URL" ]; then
    echo -e "${GREEN}✓${NC} BASE_URL: ${BASE_URL}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} BASE_URL not set (will use default: http://localhost:3000)"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
fi
echo ""

# Check TEST_USER_EMAIL
if [ -n "$TEST_USER_EMAIL" ]; then
    echo -e "${GREEN}✓${NC} TEST_USER_EMAIL: ${TEST_USER_EMAIL}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} TEST_USER_EMAIL not set"
    echo "   ${RED}Set with: export TEST_USER_EMAIL=test@example.com${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

# Check TEST_USER_PASSWORD
if [ -n "$TEST_USER_PASSWORD" ]; then
    echo -e "${GREEN}✓${NC} TEST_USER_PASSWORD: ********"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} TEST_USER_PASSWORD not set"
    echo "   ${RED}Set with: export TEST_USER_PASSWORD=yourpassword${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "3. Test Files"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check test files
TEST_FILES=(
    "tests/load/config.js"
    "tests/load/comprehensive-load.js"
    "tests/load/verify-performance-targets.js"
    "tests/load/analyze-results.js"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} ${file}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} ${file} not found"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
done
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "4. Service Availability"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if API is running
BASE_URL_CHECK=${BASE_URL:-http://localhost:3000}
if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL_CHECK}/api/health" | grep -q "200\|404"; then
    echo -e "${GREEN}✓${NC} API server is running at ${BASE_URL_CHECK}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗${NC} API server is not responding at ${BASE_URL_CHECK}"
    echo "   ${RED}Start the server with: npm run dev${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

# Check Redis connection
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is running and accessible"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠${NC} Redis is not responding"
        echo "   ${YELLOW}Cache hit rate verification will be skipped${NC}"
        CHECKS_WARNING=$((CHECKS_WARNING + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Redis CLI not available (skipping Redis check)"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "5. Results Directory"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check/create results directory
RESULTS_DIR="tests/load/results"
if [ -d "$RESULTS_DIR" ]; then
    echo -e "${GREEN}✓${NC} Results directory exists: ${RESULTS_DIR}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} Results directory does not exist"
    echo "   Creating: ${RESULTS_DIR}"
    mkdir -p "$RESULTS_DIR"
    if [ -d "$RESULTS_DIR" ]; then
        echo -e "${GREEN}✓${NC} Results directory created"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} Failed to create results directory"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo "                         SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Passed:${NC}   ${CHECKS_PASSED}"
echo -e "${YELLOW}Warnings:${NC} ${CHECKS_WARNING}"
echo -e "${RED}Failed:${NC}   ${CHECKS_FAILED}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ System is ready for performance verification${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run performance verification:"
    echo "     node tests/load/verify-performance-targets.js"
    echo ""
    echo "  2. Or run individual load tests:"
    echo "     npm run test:load:comprehensive"
    echo ""
    echo "  3. Or run all tests with report:"
    echo "     npm run test:load"
    echo ""
    exit 0
else
    echo -e "${RED}✗ System is NOT ready for performance verification${NC}"
    echo ""
    echo "Please fix the failed checks above before proceeding."
    echo ""
    exit 1
fi
