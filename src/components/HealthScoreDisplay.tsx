import { useDashboardStore } from '@/store/dashboardStore';
import { MarketHealthStatus } from '@/types/market';

/**
 * Configuration for each health status level
 * Using explicit Tailwind classes to avoid JIT compilation issues
 */
const STATUS_CONFIG: Record<MarketHealthStatus, {
  icon: string;
  label: string;
  scoreClass: string;
  labelClass: string;
  bgClass: string;
}> = {
  'very-healthy': {
    icon: '🟢',
    label: 'Very Healthy',
    scoreClass: 'text-green-600 dark:text-green-400',
    labelClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
  },
  'healthy': {
    icon: '🟢',
    label: 'Healthy',
    scoreClass: 'text-green-600 dark:text-green-400',
    labelClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
  },
  'neutral': {
    icon: '⚪',
    label: 'Neutral',
    scoreClass: 'text-gray-600 dark:text-gray-400',
    labelClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-900/30',
  },
  'unhealthy': {
    icon: '🟠',
    label: 'Unhealthy',
    scoreClass: 'text-orange-600 dark:text-orange-400',
    labelClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
  },
  'very-unhealthy': {
    icon: '🔴',
    label: 'Very Unhealthy',
    scoreClass: 'text-red-600 dark:text-red-400',
    labelClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
  },
};

/**
 * HealthScoreDisplay Component
 *
 * Hero component that displays the market health score prominently.
 * Features:
 * - Large, readable score (0-100)
 * - Visual status indicator (icon + label)
 * - Yesterday comparison with trend
 * - Responsive design
 * - Dark mode support
 * - Accessibility features
 */
export function HealthScoreDisplay() {
  const { healthScore, healthStatus, previousScore } = useDashboardStore();
  const config = STATUS_CONFIG[healthStatus];
  const change = previousScore !== null ? healthScore - previousScore : null;

  return (
    <div
      className={`rounded-2xl p-8 text-center transition-colors ${config.bgClass}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Header */}
      <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-6">
        Market Health
      </h2>

      {/* Score - Largest Element */}
      <div className="mb-6">
        <div className={`text-8xl font-bold ${config.scoreClass} transition-colors`}>
          {healthScore}
        </div>
        <div className="text-2xl text-gray-400 dark:text-gray-500 mt-2">
          / 100
        </div>
      </div>

      {/* Status Label with Icon */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-3xl" aria-hidden="true">
          {config.icon}
        </span>
        <span className={`text-2xl font-semibold ${config.labelClass} transition-colors`}>
          {config.label}
        </span>
      </div>

      {/* Yesterday Comparison */}
      {change !== null && (
        <div className="text-gray-600 dark:text-gray-400 text-base">
          <span>Yesterday: {previousScore}</span>
          {change !== 0 && (
            <span
              className={`ml-3 font-medium ${
                change > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {change > 0 ? '↑' : '↓'} {Math.abs(change)} {change > 0 ? 'Improving' : 'Declining'}
            </span>
          )}
        </div>
      )}

      {/* Screen Reader Description */}
      <span className="sr-only">
        Market health score is {healthScore} out of 100,
        {change !== null &&
          ` ${change > 0 ? 'up' : 'down'} ${Math.abs(change)} points from yesterday,`}
        {' '}currently {config.label.toLowerCase()}
      </span>
    </div>
  );
}