import { useDashboardStore } from '@/store/dashboardStore';
import { Timeframe } from '@/types/market';

export const useTimeframe = () => {
  const timeframe = useDashboardStore((state) => state.timeframe);
  const setTimeframe = useDashboardStore((state) => state.setTimeframe);

  return {
    timeframe,
    setTimeframe,
    isActive: (tf: Timeframe) => timeframe === tf,
  };
};
