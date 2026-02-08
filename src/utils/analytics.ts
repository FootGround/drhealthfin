// ============================================================================
// ANALYTICS - Privacy-respecting event tracking (Story 8)
// Console.log in development, prepared for production integration
// ============================================================================

interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props: Record<string, unknown> }) => void;
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Track analytics event
 * Respects DNT, logs in dev, forwards to analytics SDK in production
 */
export const trackEvent = (
  eventName: string,
  properties: Record<string, unknown> = {}
): void => {
  // Respect Do Not Track
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return;
  }

  const event: AnalyticsEvent = {
    name: eventName,
    properties: {
      ...properties,
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
    },
    timestamp: Date.now(),
  };

  // Development: Log to console
  if (isDev) {
    console.log('[Analytics]', eventName, properties);
    return;
  }

  // Production: Forward to available analytics service
  try {
    if (typeof window !== 'undefined') {
      if (window.plausible) {
        window.plausible(eventName, { props: event.properties });
      } else if (window.gtag) {
        window.gtag('event', eventName, event.properties);
      }
    }
  } catch {
    // Analytics should never break the app
  }
};
