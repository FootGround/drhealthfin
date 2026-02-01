import { UPDATE_INTERVALS } from '@/constants/apiConfig';

export const isMarketOpen = (): boolean => {
  const now = new Date();
  const eastern = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  const hour = eastern.getHours();
  const minutes = eastern.getMinutes();
  const day = eastern.getDay();

  // Weekend
  if (day === 0 || day === 6) return false;

  // Market hours: 9:30 AM - 4:00 PM ET
  if (hour < 9 || hour >= 16) return false;
  if (hour === 9 && minutes < 30) return false;

  return true;
};

export const getUpdateIntervals = () => {
  if (isMarketOpen()) {
    return {
      tier1: UPDATE_INTERVALS.tier1,
      standard: UPDATE_INTERVALS.standard,
    };
  }

  return {
    tier1: UPDATE_INTERVALS.afterHours.tier1,
    standard: UPDATE_INTERVALS.afterHours.standard,
  };
};

export const getMarketStatus = (): 'open' | 'pre-market' | 'after-hours' | 'closed' => {
  const now = new Date();
  const eastern = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  const hour = eastern.getHours();
  const minutes = eastern.getMinutes();
  const day = eastern.getDay();

  // Weekend
  if (day === 0 || day === 6) return 'closed';

  // Pre-market: 4:00 AM - 9:30 AM
  if (hour >= 4 && (hour < 9 || (hour === 9 && minutes < 30))) {
    return 'pre-market';
  }

  // Market hours: 9:30 AM - 4:00 PM
  if (hour >= 9 && minutes >= 30 && hour < 16) {
    return 'open';
  }

  // After hours: 4:00 PM - 8:00 PM
  if (hour >= 16 && hour < 20) {
    return 'after-hours';
  }

  return 'closed';
};
