// Simple in-memory rate limiter for API calls
class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number = 1) {
    this.minInterval = 1000 / requestsPerSecond; // Convert to milliseconds
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next API call`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  reset(): void {
    this.lastRequestTime = 0;
  }
}

// Create a singleton instance for Semantic Scholar API
export const semanticScholarRateLimiter = new RateLimiter(1); // 1 request per second

// Generic rate limiter factory
export function createRateLimiter(requestsPerSecond: number = 1): RateLimiter {
  return new RateLimiter(requestsPerSecond);
}

export { RateLimiter };
