import { UPDATE_INTERVALS } from '@/constants/apiConfig';

// Helper function to get date/time components in Eastern Time
const getEasternTimeComponents = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value || '';

  return {
    hour: parseInt(getValue('hour'), 10),
    minute: parseInt(getValue('minute'), 10),
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(getValue('weekday')),
  };
};

export const isMarketOpen = (): boolean => {
  const { hour, minute, day } = getEasternTimeComponents();

  // Weekend
  if (day === 0 || day === 6) return false;

  // Market hours: 9:30 AM - 4:00 PM ET
  if (hour < 9 || hour >= 16) return false;
  if (hour === 9 && minute < 30) return false;

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
  const { hour, minute, day } = getEasternTimeComponents();

  // Weekend
  if (day === 0 || day === 6) return 'closed';

  // Pre-market: 4:00 AM - 9:30 AM
  if (hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))) {
    return 'pre-market';
  }

  // Market hours: 9:30 AM - 4:00 PM
  if (hour >= 9 && minute >= 30 && hour < 16) {
    return 'open';
  }

  // After hours: 4:00 PM - 8:00 PM
  if (hour >= 16 && hour < 20) {
    return 'after-hours';
  }

  return 'closed';
};
