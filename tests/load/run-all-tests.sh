#!/bin/bash

# Load Testing Suite Runner
# Runs all load tests and generates a comprehensive report
#
# Requirements: 11.1, 11.2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="tests/load/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/load-test-report-${TIMESTAMP}.md"

# Create results directory
mkdir -p "${RESULTS_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WhatsApp CRM Load Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check environment variables
if [ -z "$BASE_URL" ]; then
    echo -e "${YELLOW}Warning: BASE_URL not set, using default: http://localhost:3000${NC}"
    export BASE_URL="http://localhost:3000"
fi

if [ -z "$TEST_USER_EMAIL" ] || [ -z "$TEST_USER_PASSWORD" ]; then
    echo -e "${RED}Error: TEST_USER_EMAIL and TEST_USER_PASSWORD must be set${NC}"
    exit 1
fi

# Initialize report
cat > "${REPORT_FILE}" << EOF
# Load Test Report

**Date**: $(date)
**Base URL**: ${BASE_URL}
**Test Duration**: Multiple stages (see individual tests)

## Performance Targets

Based on Requirements 11.1 and 11.2:

- **Response Time**: < 500ms for 95% of requests (p95)
- **Error Rate**: < 1% under normal load
- **Throughput**: Support 1000 concurrent users
- **Database Query Time**: < 200ms for 95% of queries

---

## Test Results

EOF

# Function to run a load test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    echo ""
    
    local result_file="${RESULTS_DIR}/${test_name}-${TIMESTAMP}.json"
    
    if k6 run --out json="${result_file}" "${test_file}"; then
        echo -e "${GREEN}✓ ${test_name} completed successfully${NC}"
        echo ""
        
        # Add to report
        cat >> "${REPORT_FILE}" << EOF
### ${test_name}

**Status**: ✅ Passed
**Results File**: \`${result_file}\`

EOF
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        echo ""
        
        # Add to report
        cat >> "${REPORT_FILE}" << EOF
### ${test_name}

**Status**: ❌ Failed
**Results File**: \`${result_file}\`

EOF
    fi
    
    echo "---"
    echo ""
}

# Run individual endpoint tests
echo -e "${YELLOW}Phase 1: Individual Endpoint Tests${NC}"
echo ""

run_test "Contacts API" "tests/load/contacts-load.js"
run_test "Messages API" "tests/load/messages-load.js"
run_test "Broadcasts API" "tests/load/broadcasts-load.js"
run_test "Conversations API" "tests/load/conversations-load.js"

# Run comprehensive test
echo -e "${YELLOW}Phase 2: Comprehensive Load Test${NC}"
echo ""

run_test "Comprehensive Load Test" "tests/load/comprehensive-load.js"

# Generate summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Load Testing Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Report saved to: ${GREEN}${REPORT_FILE}${NC}"
echo ""

# Add summary to report
cat >> "${REPORT_FILE}" << EOF

---

## Summary

All load tests have been completed. Review the individual test results above.

### Key Metrics to Review

1. **Response Time Percentiles**
   - p50 (median): Should be < 200ms
   - p95: Should be < 500ms
   - p99: Should be < 1000ms

2. **Error Rate**
   - Should be < 1% for all tests
   - Any 5xx errors indicate server issues

3. **Throughput**
   - Requests per second should remain stable
   - No degradation over time

4. **Resource Utilization**
   - Monitor database connections
   - Monitor Redis memory usage
   - Monitor API server CPU/memory

### Next Steps

If any tests failed or performance targets were not met:

1. Review the detailed results in the JSON files
2. Check application logs for errors
3. Monitor database query performance
4. Review Redis cache hit rates
5. Consider scaling infrastructure if needed

### Performance Bottlenecks

Common bottlenecks to investigate:

- Database query optimization (use indexes, query projections)
- Cache hit rate (should be > 70%)
- Connection pool exhaustion
- Rate limiting configuration
- Network latency

EOF

echo -e "${GREEN}Load testing suite completed successfully!${NC}"
echo ""
