import { useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { calculateHealthScore } from '@/utils/healthScore';

/**
 * HealthBreakdown Component
 *
 * Optional collapsible component that shows the detailed breakdown of
 * how the health score is calculated from its component parts.
 *
 * Features:
 * - Collapsed by default (progressive disclosure)
 * - Shows 3 weighted components with individual scores
 * - Keyboard accessible (Enter/Space to toggle)
 * - Smooth transitions
 * - Dark mode support
 */
export function HealthBreakdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { instruments } = useDashboardStore();

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  /**
   * Toggle expansion state
   */
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Show toggle button when collapsed
  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={false}
          aria-controls="health-breakdown"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
        >
          ▼ See calculation details
        </button>
      </div>
    );
  }

  // Calculate current health score to get component breakdown
  const result = calculateHealthScore(instruments);

  return (
    <div className="mt-4" id="health-breakdown">
      {/* Toggle Button (Expanded State) */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={true}
        aria-controls="health-breakdown-content"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
      >
        ▲ Hide calculation details
      </button>

      {/* Breakdown Content */}
      <div
        id="health-breakdown-content"
        className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-sm border border-gray-200 dark:border-gray-700"
      >
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Score Components
        </h3>

        <div className="space-y-3">
          {/* Market Direction */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300">
                Market Direction
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (40% weight)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-400 transition-all"
                  style={{ width: `${result.components.marketDirection}%` }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                {result.components.marketDirection}
              </span>
            </div>
          </div>

          {/* Risk Appetite */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300">
                Risk Appetite
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (30% weight)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 dark:bg-purple-400 transition-all"
                  style={{ width: `${result.components.riskAppetite}%` }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                {result.components.riskAppetite}
              </span>
            </div>
          </div>

          {/* Volatility */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300">
                Low Volatility
              </span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (30% weight)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 dark:bg-green-400 transition-all"
                  style={{ width: `${result.components.volatility}%` }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                {result.components.volatility}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            {result.description}
          </p>
        </div>
      </div>
    </div>
  );
}