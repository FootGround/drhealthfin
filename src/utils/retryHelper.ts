import { RETRY_CONFIG } from '@/constants/apiConfig';

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry<T>(
  url: string,
  maxRetries = RETRY_CONFIG.maxRetries
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }

      // Rate limited - wait and retry with exponential backoff
      if (response.status === 429) {
        const delay = RETRY_CONFIG.baseDelay * Math.pow(2, i);
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Other HTTP errors
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      // Last retry - throw error
      if (i === maxRetries - 1) {
        throw err;
      }

      // Network error - retry with exponential backoff
      const delay = RETRY_CONFIG.baseDelay * Math.pow(2, i);
      console.warn(`Request failed, retrying in ${delay}ms...`, err);
      await sleep(delay);
    }
  }

  throw new Error('Max retries exceeded');
}
