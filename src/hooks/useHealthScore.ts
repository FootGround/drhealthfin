import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { calculateHealthScore } from '@/utils/healthScore';

/**
 * Custom hook to automatically calculate and update market health score
 * when instrument data changes.
 *
 * This hook:
 * - Monitors the instruments state from the dashboard store
 * - Recalculates the health score when instruments update
 * - Updates the store with the new health score data
 * - Handles empty instruments gracefully (skips calculation)
 *
 * @example
 * function App() {
 *   useMarketData(); // Fetches instrument data
 *   useHealthScore(); // Calculates health score from instruments
 *   // ...
 * }
 */
export function useHealthScore() {
  const { instruments, updateHealthData } = useDashboardStore();

  useEffect(() => {
    // Only calculate if we have instrument data
    // Empty object means data hasn't loaded yet
    if (Object.keys(instruments).length === 0) return;

    // Calculate health score from current instrument data
    const result = calculateHealthScore(instruments);

    // Update store with the calculated health data
    updateHealthData(result);

  }, [instruments, updateHealthData]); // Recalculate when instruments change
}