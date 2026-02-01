import { sleep } from '@/utils/retryHelper';

export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private callsThisMinute = 0;
  private lastResetTime = Date.now();
  private readonly maxCallsPerMinute: number;

  constructor(maxCallsPerMinute: number) {
    this.maxCallsPerMinute = maxCallsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Reset counter if minute has passed
          if (Date.now() - this.lastResetTime >= 60000) {
            this.callsThisMinute = 0;
            this.lastResetTime = Date.now();
          }

          // Wait if we've hit the rate limit
          if (this.callsThisMinute >= this.maxCallsPerMinute) {
            const waitTime = 60000 - (Date.now() - this.lastResetTime);
            if (waitTime > 0) {
              console.warn(`Rate limit reached, waiting ${waitTime}ms`);
              await sleep(waitTime);
              this.callsThisMinute = 0;
              this.lastResetTime = Date.now();
            }
          }

          const result = await fn();
          this.callsThisMinute++;
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }

    this.processing = false;
  }

  getStatus() {
    return {
      callsThisMinute: this.callsThisMinute,
      queueLength: this.queue.length,
      utilizationPercent: (this.callsThisMinute / this.maxCallsPerMinute) * 100,
    };
  }
}
