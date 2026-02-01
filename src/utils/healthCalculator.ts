import { HealthStatus } from '@/types/market';

export const calculateHealth = (changePercent: number): HealthStatus => {
  if (changePercent > 0.1) return 'positive';
  if (changePercent < -0.1) return 'negative';
  return 'neutral';
};

export const isDataStale = (lastFetched: string, maxAgeMs = 5 * 60 * 1000): boolean => {
  try {
    const age = Date.now() - new Date(lastFetched).getTime();
    return age > maxAgeMs;
  } catch {
    return true;
  }
};

export const getHealthColor = (
  health: HealthStatus
): { bg: string; text: string; border: string } => {
  switch (health) {
    case 'positive':
      return {
        bg: 'bg-positive-light dark:bg-positive-dark/20',
        text: 'text-positive-dark dark:text-positive',
        border: 'border-positive/20',
      };
    case 'negative':
      return {
        bg: 'bg-negative-light dark:bg-negative-dark/20',
        text: 'text-negative-dark dark:text-negative',
        border: 'border-negative/20',
      };
    case 'neutral':
      return {
        bg: 'bg-neutral-light dark:bg-neutral-dark/20',
        text: 'text-neutral-dark dark:text-neutral',
        border: 'border-neutral/20',
      };
  }
};
