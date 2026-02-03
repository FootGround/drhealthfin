import { useMarketData } from './hooks/useMarketData';
import { useHealthScore } from './hooks/useHealthScore';
import { useDashboardStore } from './store/dashboardStore';
import { useTheme } from './hooks/useTheme';
import { getMarketStatus } from './utils/marketHours';
import { INSTRUMENTS_BY_TIER } from './constants/instruments';
import { formatCurrency, formatPercent } from './utils/formatters';
import { getHealthColor } from './utils/healthCalculator';
import { HealthScoreDisplay } from './components/HealthScoreDisplay';
import { HealthBreakdown } from './components/HealthBreakdown';
import { HealthScoreErrorBoundary } from './components/HealthScoreErrorBoundary';
import { Moon, Sun } from 'lucide-react';

function App() {
  useMarketData();
  useHealthScore(); // Calculate health score from instruments
  const { theme, toggleTheme } = useTheme();
  const { instruments, isLoading, error, focusMode, setFocusMode } = useDashboardStore();

  const marketStatus = getMarketStatus();

  const tier1 = INSTRUMENTS_BY_TIER[1] || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Market Compass
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time Financial Market Health
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Market Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    marketStatus === 'open'
                      ? 'bg-green-500'
                      : marketStatus === 'pre-market' || marketStatus === 'after-hours'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {marketStatus.replace('-', ' ')}
                </span>
              </div>

              {/* Focus Mode Toggle */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  focusMode
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                }`}
              >
                {focusMode ? 'Full View' : 'Focus Mode'}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading market data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* NEW: Market Health Score - Primary */}
            <section className="mb-12">
              <div className="max-w-2xl mx-auto">
                <HealthScoreErrorBoundary>
                  <HealthScoreDisplay />
                  <HealthBreakdown />
                </HealthScoreErrorBoundary>
              </div>
            </section>

            {/* Individual Metrics - Secondary (Collapsible) */}
            <details className="mb-8" open>
              <summary className="cursor-pointer text-lg font-semibold mb-4 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 inline-block">
                Show individual metrics ▼
              </summary>

              {/* Tier 1: Core Metrics */}
              <section className="mb-8">
                <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
                  Market Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {tier1.map((def) => {
                    const instrument = instruments[def.ticker];
                    if (!instrument) return null;

                    const colors = getHealthColor(instrument.health);

                    return (
                      <div
                        key={instrument.ticker}
                        className={`card ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {instrument.name}
                            </p>
                            <p className="text-sm font-mono text-gray-500 dark:text-gray-500">
                              {instrument.ticker}
                            </p>
                          </div>
                          <span className={`badge ${colors.text}`}>
                            {formatPercent(instrument.changePercent)}
                          </span>
                        </div>
                        <p className={`text-2xl font-bold ${colors.text}`}>
                          {formatCurrency(instrument.currentPrice)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {instrument.tooltip}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Other Tiers - Hidden in Focus Mode */}
              {!focusMode && (
                <section>
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      Additional tiers (Tier 2-6) will be displayed here.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Component structure is ready for implementation.
                    </p>
                  </div>
                </section>
              )}
            </details>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Built with React + Vite | Data from Finnhub & Twelve Data | Hosted on GitHub Pages
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
