import { createLogger } from './logger';

const logger = createLogger('metrics');

interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush metrics every 60 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 60000);
  }

  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.record({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.record({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  }

  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.record({
      name: `${name}.duration`,
      value: duration,
      tags,
      timestamp: new Date(),
    });
  }

  private record(metric: Metric) {
    this.metrics.push(metric);
    
    // Log metric for debugging
    logger.debug({
      metric: metric.name,
      value: metric.value,
      tags: metric.tags,
    });
  }

  private flush() {
    if (this.metrics.length === 0) return;

    // In production, send to monitoring service (Prometheus, Datadog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service
      logger.info(`Flushing ${this.metrics.length} metrics`);
    }

    this.metrics = [];
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const metrics = new MetricsCollector();

// Helper function to measure execution time
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.timing(name, duration, tags);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.timing(name, duration, { ...tags, error: 'true' });
    throw error;
  }
}

export default metrics;
