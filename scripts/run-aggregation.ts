#!/usr/bin/env ts-node
/**
 * Manual script to run dashboard metrics aggregation
 * 
 * Usage:
 *   npm run aggregate:hourly
 *   npm run aggregate:daily
 *   npm run aggregate:weekly
 */

import { aggregateHourlyMetrics, aggregateDailyMetrics, aggregateWeeklyMetrics } from '../lib/workers/dashboard-aggregation.worker'

const type = process.argv[2] || 'hourly'

async function main() {
  console.log(`🚀 Running ${type} metrics aggregation...`)
  
  try {
    switch (type) {
      case 'hourly':
        await aggregateHourlyMetrics()
        break
      case 'daily':
        await aggregateDailyMetrics()
        break
      case 'weekly':
        await aggregateWeeklyMetrics()
        break
      default:
        console.error('❌ Invalid type. Use: hourly, daily, or weekly')
        process.exit(1)
    }
    
    console.log('✅ Aggregation completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Aggregation failed:', error)
    process.exit(1)
  }
}

main()
