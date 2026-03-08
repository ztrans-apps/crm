/**
 * Load Test Results Analyzer
 * 
 * Analyzes k6 JSON output to identify performance bottlenecks
 * and generate actionable recommendations.
 * 
 * Requirements: 11.1, 11.2
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds from requirements
const THRESHOLDS = {
  p50: 200,  // 50th percentile should be < 200ms
  p95: 500,  // 95th percentile should be < 500ms (Requirement 11.1)
  p99: 1000, // 99th percentile should be < 1000ms
  errorRate: 0.01, // Error rate should be < 1% (Requirement 11.2)
  minRequestRate: 10, // Minimum requests per second
};

function analyzeResults(resultsFile) {
  console.log(`\n📊 Analyzing: ${resultsFile}\n`);
  
  // Read and parse results
  const data = fs.readFileSync(resultsFile, 'utf8');
  const lines = data.trim().split('\n');
  
  const metrics = {
    requests: [],
    errors: [],
    durations: [],
    endpoints: {},
  };
  
  // Parse JSON lines
  lines.forEach(line => {
    try {
      const entry = JSON.parse(line);
      
      if (entry.type === 'Point' && entry.metric === 'http_req_duration') {
        metrics.durations.push(entry.data.value);
        
        // Track by endpoint
        const endpoint = entry.data.tags?.endpoint || 'unknown';
        if (!metrics.endpoints[endpoint]) {
          metrics.endpoints[endpoint] = [];
        }
        metrics.endpoints[endpoint].push(entry.data.value);
      }
      
      if (entry.type === 'Point' && entry.metric === 'http_reqs') {
        metrics.requests.push(entry.data.value);
      }
      
      if (entry.type === 'Point' && entry.metric === 'http_req_failed') {
        if (entry.data.value > 0) {
          metrics.errors.push(entry);
        }
      }
    } catch (e) {
      // Skip invalid lines
    }
  });
  
  // Calculate statistics
  const stats = calculateStats(metrics.durations);
  const errorRate = metrics.errors.length / metrics.requests.length;
  
  // Generate report
  console.log('═══════════════════════════════════════════════════════');
  console.log('                  PERFORMANCE SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Response time analysis
  console.log('📈 Response Time Percentiles:');
  console.log(`   p50 (median): ${stats.p50.toFixed(2)}ms ${checkThreshold(stats.p50, THRESHOLDS.p50)}`);
  console.log(`   p95:          ${stats.p95.toFixed(2)}ms ${checkThreshold(stats.p95, THRESHOLDS.p95)}`);
  console.log(`   p99:          ${stats.p99.toFixed(2)}ms ${checkThreshold(stats.p99, THRESHOLDS.p99)}`);
  console.log(`   Average:      ${stats.avg.toFixed(2)}ms`);
  console.log(`   Min:          ${stats.min.toFixed(2)}ms`);
  console.log(`   Max:          ${stats.max.toFixed(2)}ms\n`);
  
  // Error rate analysis
  console.log('❌ Error Rate:');
  console.log(`   Errors:       ${metrics.errors.length}`);
  console.log(`   Total:        ${metrics.requests.length}`);
  console.log(`   Rate:         ${(errorRate * 100).toFixed(2)}% ${checkThreshold(errorRate, THRESHOLDS.errorRate, true)}\n`);
  
  // Endpoint breakdown
  console.log('🎯 Endpoint Performance:');
  Object.entries(metrics.endpoints).forEach(([endpoint, durations]) => {
    const endpointStats = calculateStats(durations);
    console.log(`   ${endpoint}:`);
    console.log(`     p95: ${endpointStats.p95.toFixed(2)}ms ${checkThreshold(endpointStats.p95, THRESHOLDS.p95)}`);
    console.log(`     avg: ${endpointStats.avg.toFixed(2)}ms`);
  });
  console.log('');
  
  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(stats, errorRate, metrics.endpoints);
  
  if (bottlenecks.length > 0) {
    console.log('⚠️  PERFORMANCE BOTTLENECKS DETECTED:\n');
    bottlenecks.forEach((bottleneck, index) => {
      console.log(`   ${index + 1}. ${bottleneck.issue}`);
      console.log(`      Impact: ${bottleneck.impact}`);
      console.log(`      Recommendation: ${bottleneck.recommendation}\n`);
    });
  } else {
    console.log('✅ No performance bottlenecks detected!\n');
  }
  
  // Overall assessment
  const passed = stats.p95 < THRESHOLDS.p95 && errorRate < THRESHOLDS.errorRate;
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   OVERALL: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  return { stats, errorRate, bottlenecks, passed };
}

function calculateStats(values) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / values.length,
    p50: percentile(sorted, 0.50),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}

function percentile(sorted, p) {
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

function checkThreshold(value, threshold, inverse = false) {
  const passed = inverse ? value < threshold : value < threshold;
  return passed ? '✅' : '❌';
}

function identifyBottlenecks(stats, errorRate, endpoints) {
  const bottlenecks = [];
  
  // Check response time
  if (stats.p95 > THRESHOLDS.p95) {
    bottlenecks.push({
      issue: `High p95 response time: ${stats.p95.toFixed(2)}ms (target: < ${THRESHOLDS.p95}ms)`,
      impact: 'Users experiencing slow responses',
      recommendation: 'Review database query optimization, add indexes, implement caching, or scale infrastructure',
    });
  }
  
  if (stats.p99 > THRESHOLDS.p99) {
    bottlenecks.push({
      issue: `High p99 response time: ${stats.p99.toFixed(2)}ms (target: < ${THRESHOLDS.p99}ms)`,
      impact: 'Some users experiencing very slow responses',
      recommendation: 'Investigate slow queries, optimize N+1 queries, review connection pool settings',
    });
  }
  
  // Check error rate
  if (errorRate > THRESHOLDS.errorRate) {
    bottlenecks.push({
      issue: `High error rate: ${(errorRate * 100).toFixed(2)}% (target: < ${THRESHOLDS.errorRate * 100}%)`,
      impact: 'Users experiencing failures',
      recommendation: 'Review application logs, check database connection limits, verify rate limiting configuration',
    });
  }
  
  // Check endpoint-specific issues
  Object.entries(endpoints).forEach(([endpoint, durations]) => {
    const endpointStats = calculateStats(durations);
    if (endpointStats.p95 > THRESHOLDS.p95 * 1.5) {
      bottlenecks.push({
        issue: `Slow endpoint: ${endpoint} (p95: ${endpointStats.p95.toFixed(2)}ms)`,
        impact: `${endpoint} operations are significantly slower than target`,
        recommendation: `Optimize ${endpoint} endpoint: review queries, add caching, implement pagination`,
      });
    }
  });
  
  return bottlenecks;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node analyze-results.js <results-file.json>');
    console.log('');
    console.log('Example:');
    console.log('  node analyze-results.js tests/load/results/contacts-load-20240101_120000.json');
    process.exit(1);
  }
  
  const resultsFile = args[0];
  
  if (!fs.existsSync(resultsFile)) {
    console.error(`Error: File not found: ${resultsFile}`);
    process.exit(1);
  }
  
  const result = analyzeResults(resultsFile);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { analyzeResults, calculateStats, identifyBottlenecks };
