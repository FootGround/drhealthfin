# Technical Requirements Document (TRD)
## Market Compass Financial Dashboard

**Version:** 1.0
**Last Updated:** 2026-02-01
**Status:** Draft

---

## 1. System Architecture

### 1.1 Architecture Pattern
**Client-Side Only (100% Free)**

```
┌─────────────────────────────────────────────────────────┐
│ GitHub Pages (Static Hosting)                           │
│ └─ Serves pre-built React SPA                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Client Browser                                           │
│ ├─ Fetches real-time data from Finnhub API             │
│ ├─ Fetches historical data from Twelve Data API         │
│ ├─ Processes & caches in-memory                         │
│ └─ Renders visualizations                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────┬──────────────────────────────────┐
│ Finnhub API          │ Twelve Data API                  │
│ (Free Tier)          │ (Free Tier)                      │
│ ├─ 60 calls/min      │ ├─ 800 calls/day                 │
│ ├─ Real-time quotes  │ ├─ Time series data              │
│ └─ Stocks/ETFs       │ └─ Better index coverage         │
└──────────────────────┴──────────────────────────────────┘
```

**Rationale:**
- **Zero cost** - No GitHub Actions usage, no backend servers
- **True real-time** - Updates every 15-60 seconds
- **No CORS issues** - Both APIs support client-side requests
- **Simple deployment** - Just static files on GitHub Pages

---

## 2. Data Layer Specifications

### 2.1 Data Sources

**Primary API: Finnhub** (Real-time quotes)
- **Rate Limit:** 60 API calls/minute (free forever)
- **Coverage:** All stocks, ETFs
- **Update Frequency:** 15-60 seconds
- **Endpoint:** `https://finnhub.io/api/v1/quote`
- **Sign up:** https://finnhub.io/register (no credit card)

**Secondary API: Twelve Data** (Historical + Indices)
- **Rate Limit:** 800 API calls/day
- **Coverage:** Better support for indices (^VIX, ^TNX, ^DJI)
- **Use case:** Sparkline historical data, timeframe calculations
- **Endpoint:** `https://api.twelvedata.com/time_series`
- **Sign up:** https://twelvedata.com/pricing (free tier)

### 2.1.1 Symbol Mapping & Update Strategy

| Tier | Instruments | API | Refresh Rate | Calls/Min |
|------|-------------|-----|--------------|-----------|
| **1** | SPY, QQQ, IWM | Finnhub | 15 seconds | 12/min |
| **1** | ^VIX, ^TNX (10Y) | Twelve Data | 30 seconds | 4/min |
| **2** | URTH, ACWI, ^DJI | Finnhub | 60 seconds | 3/min |
| **3** | RSP, VTV, VUG | Finnhub | 60 seconds | 3/min |
| **4** | XLK, XLF, XLE, XLV, XLY, XLP | Finnhub | 60 seconds | 6/min |
| **5** | DX-Y.NYB, CL=F, GC=F | Finnhub | 60 seconds | 3/min |
| **6** | AAPL, MSFT, NVDA, AMZN, JPM | Finnhub | 60 seconds | 5/min |
| | | **TOTAL** | | **36/min** ✓ |

**Rate Limit Safety:**
- Finnhub: 36/60 = 60% utilization (safe buffer)
- Twelve Data: 4/min = 5,760/day (under 800/day limit via caching)

**Symbol Translation:**
```javascript
const SYMBOL_MAP = {
  '10Y': '^TNX',      // 10-year Treasury
  'VIX': '^VIX',      // CBOE Volatility Index
  'DJIA': '^DJI',     // Dow Jones
  'DXY': 'DX-Y.NYB',  // Dollar Index
  'WTI': 'CL=F',      // Crude Oil Futures
  'Gold': 'GC=F'      // Gold Futures
};
```

### 2.2 Data Schema (In-Memory State)

**Zustand Store Structure:**
```typescript
// src/store/dashboardStore.ts
interface MarketDataStore {
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;

  instruments: {
    [ticker: string]: {
      ticker: string;
      name: string;
      currentPrice: number;
      change: number;
      changePercent: number;
      previousClose: number;
      tier: 1 | 2 | 3 | 4 | 5 | 6;
      category: 'equity' | 'index' | 'commodity' | 'currency';
      sparkline: number[];        // Last 20 data points
      health: 'positive' | 'negative' | 'neutral';
      tooltip: string;
      lastFetched: string;        // ISO timestamp
    };
  };

  calculatedMetrics: {
    vtvVugRatio: number;          // Value vs Growth
    xlyXlpRatio: number;          // Consumer Confidence
  };

  // Historical data for timeframe calculations
  historical: {
    [ticker: string]: {
      '1D': number[];             // Intraday prices
      '1W': number[];             // 5 trading days
      '1M': number[];             // 20 trading days
      'YTD': number[];            // Year to date
    };
  };
}
```

**API Response Mapping:**

**Finnhub Quote Response:**
```json
{
  "c": 450.23,    // Current price
  "h": 452.10,    // High
  "l": 448.50,    // Low
  "o": 449.00,    // Open
  "pc": 448.89,   // Previous close
  "t": 1704153600 // Timestamp
}
```

**Transform Function:**
```typescript
const transformFinnhubQuote = (ticker: string, data: FinnhubQuote) => ({
  ticker,
  currentPrice: data.c,
  change: data.c - data.pc,
  changePercent: ((data.c - data.pc) / data.pc) * 100,
  previousClose: data.pc,
  lastFetched: new Date().toISOString()
});
```

### 2.3 Client-Side Data Fetching Pipeline

**Service Architecture:**
```typescript
// src/services/marketDataService.ts

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const TWELVE_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;

class MarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 15000; // 15 seconds

  // Fetch real-time quote from Finnhub
  async fetchQuote(ticker: string): Promise<Quote> {
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Failed to fetch ${ticker}`);

    const data = await response.json();
    this.cache.set(ticker, { data, timestamp: Date.now() });
    return data;
  }

  // Fetch historical data for sparklines
  async fetchHistorical(ticker: string, interval: string): Promise<number[]> {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=${interval}&outputsize=20&apikey=${TWELVE_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.values.map(v => parseFloat(v.close));
  }

  // Batch fetch multiple symbols
  async fetchBatch(tickers: string[]): Promise<Map<string, Quote>> {
    const promises = tickers.map(ticker =>
      this.fetchQuote(ticker).catch(err => {
        console.error(`Failed to fetch ${ticker}:`, err);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    const map = new Map();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        map.set(tickers[index], result.value);
      }
    });

    return map;
  }
}

export const marketDataService = new MarketDataService();
```

**Update Intervals:**
```typescript
// src/hooks/useMarketData.ts
export const useMarketData = () => {
  const { updateInstrument, setLoading, setError } = useStore();

  useEffect(() => {
    // Tier 1: High-priority symbols (every 15 seconds)
    const tier1Interval = setInterval(async () => {
      const tier1Symbols = ['SPY', 'QQQ', 'IWM'];
      const data = await marketDataService.fetchBatch(tier1Symbols);

      data.forEach((quote, ticker) => {
        updateInstrument(ticker, transformQuote(ticker, quote));
      });
    }, 15000);

    // Tiers 2-6: Standard symbols (every 60 seconds)
    const standardInterval = setInterval(async () => {
      const symbols = [
        'URTH', 'ACWI', 'RSP', 'VTV', 'VUG',
        'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP',
        'AAPL', 'MSFT', 'NVDA', 'AMZN', 'JPM'
      ];
      const data = await marketDataService.fetchBatch(symbols);

      data.forEach((quote, ticker) => {
        updateInstrument(ticker, transformQuote(ticker, quote));
      });
    }, 60000);

    // Initial fetch on mount
    fetchAllData();

    return () => {
      clearInterval(tier1Interval);
      clearInterval(standardInterval);
    };
  }, []);
};
```

**Error Handling & Resilience:**
```typescript
// Retry logic with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();

      // Rate limited - wait and retry
      if (response.status === 429) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}

// Stale data indicator
const isDataStale = (lastFetched: string) => {
  const age = Date.now() - new Date(lastFetched).getTime();
  return age > 5 * 60 * 1000; // 5 minutes
};
```

**Rate Limit Management:**
```typescript
class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private callsThisMinute = 0;
  private maxCallsPerMinute = 55; // Buffer under 60 limit

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          if (this.callsThisMinute >= this.maxCallsPerMinute) {
            await sleep(60000); // Wait 1 minute
            this.callsThisMinute = 0;
          }

          const result = await fn();
          this.callsThisMinute++;
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task();
    }
    this.processing = false;
  }
}
```

### 2.4 API Integration Checklist

**Setup Steps:**

1. **Register for API Keys (5 minutes):**
   ```bash
   # Finnhub (for real-time quotes)
   # Visit: https://finnhub.io/register
   # Free tier: 60 API calls/minute
   # Copy API key → Save to .env

   # Twelve Data (for historical/indices)
   # Visit: https://twelvedata.com/pricing
   # Free tier: 800 API calls/day
   # Copy API key → Save to .env
   ```

2. **Test API Access:**
   ```bash
   # Test Finnhub
   curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY"

   # Expected response:
   # {"c":150.23,"h":151.00,"l":149.50,"o":150.00,"pc":149.80,"t":1704153600}

   # Test Twelve Data
   curl "https://api.twelvedata.com/time_series?symbol=SPY&interval=1min&outputsize=5&apikey=YOUR_KEY"
   ```

3. **Configure Environment:**
   ```bash
   # .env
   VITE_FINNHUB_API_KEY=abc123...
   VITE_TWELVE_DATA_API_KEY=xyz789...
   ```

4. **Implement Service Layer:**
   - Create `src/services/marketDataService.ts`
   - Implement caching (15-second TTL)
   - Add retry logic (3 attempts, exponential backoff)
   - Batch requests to stay under rate limits

5. **Monitor Usage:**
   - Finnhub dashboard: https://finnhub.io/dashboard
   - Twelve Data dashboard: https://twelvedata.com/account
   - Set alerts at 80% of free tier usage

**Expected API Call Volume:**

| Time Period | Finnhub Calls | Twelve Data Calls |
|-------------|---------------|-------------------|
| Per minute  | 36 (60% of limit) | ~4 |
| Per hour    | 2,160 | 240 |
| Per day     | ~20,000 (during market hours) | ~2,880 |

**Both APIs well under free tier limits** ✓

### 2.5 Market Hours & Data Availability

**Update Strategy Based on Market Status:**

```typescript
// src/utils/marketHours.ts
const isMarketOpen = () => {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hour = eastern.getHours();
  const day = eastern.getDay();

  // Weekend
  if (day === 0 || day === 6) return false;

  // Weekday 9:30 AM - 4:00 PM ET
  return hour >= 9 && (hour < 16 || (hour === 9 && eastern.getMinutes() >= 30));
};

// Adjust update frequency
const getUpdateInterval = () => {
  if (isMarketOpen()) {
    return {
      tier1: 15000,    // 15 seconds during market hours
      standard: 60000  // 1 minute
    };
  } else {
    return {
      tier1: 300000,   // 5 minutes after hours
      standard: 600000 // 10 minutes
    };
  }
};
```

**Data Availability:**
- **During Market Hours (9:30 AM - 4:00 PM ET):** Real-time quotes
- **Pre-Market (4:00 AM - 9:30 AM ET):** Limited data, use previous close
- **After Hours (4:00 PM - 8:00 PM ET):** Extended hours data available
- **Overnight/Weekends:** Display last available data with "Market Closed" badge

**User Experience:**
```typescript
const MarketStatusBanner = () => {
  const isOpen = isMarketOpen();

  if (!isOpen) {
    return (
      <Banner color="blue">
        Market Closed. Displaying last available data.
      </Banner>
    );
  }

  return null;
};
```

---

## 3. Frontend Specifications

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | **React 18 + Vite** | Fast dev server, optimal bundle size, GitHub Pages compatible |
| State Management | **Zustand** | Lightweight (<1kb), simpler than Redux for this scope |
| Styling | **Tailwind CSS** | Utility-first, built-in dark mode, rapid prototyping |
| Charts | **Recharts** | React-native, composable, 30kb gzipped |
| Icons | **Lucide React** | Modern, tree-shakeable, consistent style |
| Utilities | **date-fns** | Lightweight date formatting |

### 3.2 Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx           # Logo, theme toggle, focus mode
│   │   ├── Dashboard.tsx        # Main grid container
│   │   ├── Footer.tsx
│   │   └── StatusIndicator.tsx  # Data freshness & API status
│   ├── cards/
│   │   ├── HealthCard.tsx       # Reusable card component
│   │   ├── SparklineChart.tsx   # Mini trend chart
│   │   ├── GaugeChart.tsx       # VIX speedometer
│   │   └── RatioBar.tsx         # VTV/VUG, XLY/XLP sliders
│   ├── tiers/
│   │   ├── Tier1Header.tsx      # Sticky 5-metric header
│   │   ├── Tier2Market.tsx
│   │   ├── Tier3Style.tsx
│   │   ├── Tier4Sectors.tsx
│   │   ├── Tier5Macro.tsx
│   │   └── Tier6Stocks.tsx
│   └── shared/
│       ├── Tooltip.tsx
│       ├── TimeframeToggle.tsx
│       ├── ExportButton.tsx
│       └── LoadingState.tsx     # Skeleton loaders
├── services/
│   ├── marketDataService.ts     # API client & caching
│   ├── rateLimiter.ts           # Rate limit management
│   └── symbolMapper.ts          # Ticker normalization
├── hooks/
│   ├── useMarketData.ts         # Real-time data fetching
│   ├── useTimeframe.ts          # Manage timeframe state
│   ├── useTheme.ts              # Dark/light mode
│   └── useHealthStatus.ts       # Calculate market health
├── store/
│   └── dashboardStore.ts        # Zustand global state
├── utils/
│   ├── healthCalculator.ts      # Determine red/green/grey
│   ├── formatters.ts            # Currency, percent formatting
│   ├── exportSnapshot.ts        # html2canvas wrapper
│   └── retryHelper.ts           # Exponential backoff logic
├── constants/
│   ├── instruments.ts           # Symbol definitions by tier
│   └── apiConfig.ts             # API endpoints & keys
└── types/
    ├── market.ts                # Market data interfaces
    └── api.ts                   # API response types
```

### 3.3 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | <1.5s | Lighthouse |
| Time to Interactive (TTI) | <3s | Lighthouse |
| Bundle Size (JS) | <150kb gzipped | Vite build analysis |
| Lighthouse Score | >90 | CI/CD check |
| Data Fetch Time | <500ms | Client-side timing |

**Optimization Strategies:**
- Code splitting by tier (lazy load Tier 4-6 on scroll)
- Tree-shake unused Tailwind classes
- Compress JSON with Brotli
- Cache market-data.json with Service Worker (optional v2)

---

## 4. Visual Design System

### 4.1 Color Tokens (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        positive: {
          light: '#D1FAE5', // Soft Mint
          DEFAULT: '#10B981', // Emerald
        },
        negative: {
          light: '#FEE2E2', // Soft Coral
          DEFAULT: '#EF4444', // Rose
        },
        neutral: {
          light: '#F1F5F9',
          DEFAULT: '#64748B', // Slate
        }
      }
    }
  }
}
```

### 4.2 Responsive Breakpoints

```
Mobile:  <640px  (1 column)
Tablet:  640-1024px (2 columns)
Desktop: >1024px (4 columns)
```

### 4.3 Typography Scale

```
Tier 1 Metrics: text-4xl (36px)
Tier 2-6 Cards: text-2xl (24px)
Body Text: text-base (16px)
Tooltips: text-sm (14px)
```

---

## 5. Feature Implementation

### 5.1 Focus Mode (Minimalist View)

**State Management:**
```typescript
const [focusMode, setFocusMode] = useState(false);
```

**Behavior:**
- Toggle button in header
- When enabled: Hide all tiers except Tier 1
- Animate transition with Tailwind `transition-all duration-300`
- Persist state in localStorage

### 5.2 Timeframe Toggle

**Options:** 1D | 1W | 1M | YTD (default: 1D)

**Implementation:**
```typescript
const [timeframe, setTimeframe] = useTimeframe('1D');

// All calculations read from:
marketData.timeframes[timeframe].instruments
```

### 5.3 Snapshot Export

**Library:** `html2canvas` + `FileSaver.js`

**Flow:**
1. User clicks "Share" button
2. Hide UI controls (buttons, toggles)
3. Render dashboard to canvas
4. Convert to PNG
5. Trigger download with filename: `market-compass-YYYY-MM-DD.png`
6. Restore UI controls

---

## 6. Testing Requirements

### 6.1 Test Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Unit Tests | >70% | Vitest |
| Component Tests | All interactive components | Testing Library |
| E2E Tests | Critical user paths | Playwright |

### 6.2 Critical Test Cases

**Unit Tests:**
- [ ] `healthCalculator` correctly classifies positive/negative/neutral
- [ ] `formatters` handle edge cases (null, 0, very large numbers)
- [ ] Ratio calculations (VTV/VUG, XLY/XLP) are accurate

**Component Tests:**
- [ ] `HealthCard` renders all states (loading, error, success)
- [ ] `TimeframeToggle` updates global state
- [ ] `Tooltip` displays on hover

**E2E Tests:**
- [ ] Dashboard loads with valid data
- [ ] Focus mode hides/shows correct tiers
- [ ] Timeframe toggle updates all cards
- [ ] Export generates downloadable PNG

---

## 7. Deployment Pipeline

### 7.1 CI/CD Workflow (.github/workflows/deploy.yml)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run Lighthouse CI
        run: npm run lighthouse

      - name: Build
        env:
          VITE_FINNHUB_API_KEY: ${{ secrets.FINNHUB_API_KEY }}
          VITE_TWELVE_DATA_API_KEY: ${{ secrets.TWELVE_DATA_API_KEY }}
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Simplified Workflow:**
- No data fetching (happens client-side)
- No scheduled cron jobs (zero Actions minutes used)
- Only deploys on code changes

### 7.2 Environment Variables

**Stored in GitHub Repository Secrets:**
- `FINNHUB_API_KEY` - Get from https://finnhub.io/register
- `TWELVE_DATA_API_KEY` - Get from https://twelvedata.com/pricing

**Build-time Environment Variables (.env):**
```bash
# .env.example (commit this)
VITE_FINNHUB_API_KEY=your_key_here
VITE_TWELVE_DATA_API_KEY=your_key_here

# .env (DO NOT COMMIT - add to .gitignore)
VITE_FINNHUB_API_KEY=actual_key_123abc
VITE_TWELVE_DATA_API_KEY=actual_key_456def
```

**Local Development:**
```bash
# Create .env file
cp .env.example .env

# Add your API keys
# Keys will be embedded in built JS (acceptable for free tier keys)
```

---

## 8. Security & Compliance

### 8.1 Data Privacy
- **No PII Collection:** No user data tracked
- **No Cookies:** Except localStorage for theme/preferences
- **No Analytics:** Optional privacy-friendly Plausible.io (v2)

### 8.2 Content Security Policy

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               connect-src 'self' https://finnhub.io https://api.twelvedata.com;
               script-src 'self';
               style-src 'self' 'unsafe-inline';">
```

**Note:** `connect-src` allows API requests to Finnhub and Twelve Data

### 8.3 API Key Security

**Trade-off for Free Hosting:**
- API keys are embedded in built JavaScript (visible to users)
- **This is acceptable** because:
  - Free tier keys have no monetary value
  - Rate limits prevent abuse (60 calls/min)
  - Keys can be rotated instantly if abused
  - Alternative (serverless proxy) costs money or complexity

**Mitigation Strategies:**
1. **Use domain restrictions** (if API supports it):
   ```
   Restrict key to: https://yourusername.github.io
   ```

2. **Monitor usage** via API dashboard:
   - Set up usage alerts at 80% of free tier
   - Rotate keys monthly as best practice

3. **Rate limit client-side:**
   ```typescript
   // Prevent runaway loops
   const MAX_CALLS_PER_SESSION = 1000;
   ```

4. **Obfuscate (security through obscurity):**
   ```typescript
   // Slightly obfuscate in source (still visible in DevTools)
   const key = atob(import.meta.env.VITE_FINNHUB_KEY_B64);
   ```

**For Production (v2):** Consider Cloudflare Workers (free tier) to proxy requests and hide keys

---

## 9. Monitoring & Observability

### 9.1 Data Freshness Monitoring

**Real-time Status Indicator:**
```typescript
// Display in header
const DataStatus = () => {
  const { lastUpdated, error } = useStore();
  const age = Date.now() - new Date(lastUpdated).getTime();

  if (error) return <Badge color="red">API Error</Badge>;
  if (age < 30000) return <Badge color="green">Live</Badge>;
  if (age < 300000) return <Badge color="yellow">Delayed</Badge>;
  return <Badge color="red">Stale</Badge>;
};
```

**Metrics to Display:**
- Last successful fetch timestamp
- Number of failed API calls in last 5 minutes
- Current rate limit utilization (X/60 calls used)

### 9.2 API Health Monitoring

**Client-side Dashboard:**
```typescript
interface APIStatus {
  finnhub: {
    operational: boolean;
    latency: number;        // ms
    successRate: number;    // % over last 100 calls
    callsThisMinute: number;
  };
  twelveData: {
    operational: boolean;
    callsToday: number;
    remainingQuota: number;
  };
}
```

**Visual Indicators:**
- Green dot = All APIs responding
- Yellow dot = Degraded (>1s latency or <90% success)
- Red dot = Down or rate limited

### 9.3 Error Logging

**Development:**
```typescript
if (import.meta.env.DEV) {
  console.group('Market Data Fetch');
  console.log('Ticker:', ticker);
  console.log('Response:', data);
  console.groupEnd();
}
```

**Production:**
- **Option 1 (Free):** localStorage-based error log
  ```typescript
  const logError = (error: Error) => {
    const errors = JSON.parse(localStorage.getItem('errors') || '[]');
    errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack
    });
    localStorage.setItem('errors', JSON.stringify(errors.slice(-50)));
  };
  ```

- **Option 2 (Recommended):** Sentry free tier (5k events/month)
  ```typescript
  Sentry.init({
    dsn: 'your_sentry_dsn',
    environment: 'production'
  });
  ```

### 9.4 User-Facing Error Messages

**Error States:**
```typescript
const ErrorDisplay = ({ error }) => {
  const messages = {
    RATE_LIMIT: "Too many requests. Data will resume in 1 minute.",
    NETWORK: "Unable to reach market data servers. Check connection.",
    API_KEY: "Invalid API configuration. Please contact support.",
    UNKNOWN: "Something went wrong. Retrying..."
  };

  return (
    <Alert severity="warning">
      {messages[error.type] || messages.UNKNOWN}
    </Alert>
  );
};
```

---

## 10. Non-Functional Requirements

### 10.1 Accessibility (WCAG 2.1 AA)
- [ ] All interactive elements keyboard navigable
- [ ] Color contrast ratio >4.5:1
- [ ] ARIA labels on charts
- [ ] Screen reader tested

### 10.2 Browser Support
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari/Chrome

### 10.3 Scalability Constraints
- **Max instruments:** 50 (current: 30)
- **Max historical data:** 90 days
- **Repo size limit:** <1GB (GitHub Pages limit)

---

## 11. Development Milestones

### Phase 1: Foundation (Week 1)
- [ ] Project scaffolding (Vite + React + Tailwind + TypeScript)
- [ ] Set up Finnhub & Twelve Data accounts
- [ ] Implement `marketDataService` with caching
- [ ] Create Zustand store structure
- [ ] Build basic HealthCard component
- [ ] Implement real-time data fetching for 3 test symbols

### Phase 2: Core Features (Week 2)
- [ ] All 6 tiers implemented with correct symbols
- [ ] Tiered update intervals (15s for Tier 1, 60s for others)
- [ ] Rate limiter working (staying under 60 calls/min)
- [ ] Timeframe toggle (1D, 1W, 1M, YTD)
- [ ] Dark mode theme toggle
- [ ] Health calculation logic (positive/negative/neutral)

### Phase 3: Visualizations (Week 3)
- [ ] Sparkline charts integrated
- [ ] VIX gauge/speedometer
- [ ] Ratio bars (VTV/VUG, XLY/XLP)
- [ ] Tooltips with plain English explanations
- [ ] Responsive grid (4 col → 2 col → 1 col)
- [ ] Loading skeletons and error states

### Phase 4: Polish & Deploy (Week 4)
- [ ] Export to PNG feature
- [ ] Focus mode (minimalist view)
- [ ] Data freshness indicator
- [ ] API status monitoring
- [ ] Testing suite (Vitest + Playwright)
- [ ] Lighthouse optimization (score >90)
- [ ] README with setup instructions
- [ ] Deploy to GitHub Pages
- [ ] Domain setup (optional: custom domain)

---

## 12. Future Considerations (v2.0)

**Architecture Upgrades:**
- **Serverless Backend:** Add Cloudflare Workers to hide API keys
- **WebSockets:** True streaming data (requires paid API tier)
- **Service Worker:** Offline support + background sync
- **IndexedDB:** Store 90 days of historical data locally

**Performance Optimizations:**
- Virtual scrolling for Tier 6 if >20 stocks
- Web Workers for data processing (offload from main thread)
- A/B test chart libraries (Plotly, D3, Lightweight Charts)
- Pre-calculate sparklines server-side

**Feature Expansion:**
- **Portfolio Tracking:** User authentication (GitHub OAuth)
- **Historical Playback:** "Rewind" to see market 30 days ago
- **Custom Watchlist:** Let users add/remove symbols
- **Alerts:** Browser notifications when VIX > 30 or SPY changes > 2%
- **News Integration:** Show headlines for "red" instruments
- **Social Sharing:** Generate shareable dashboard URLs with state

**Data Enhancements:**
- Add options flow data (if free API available)
- Crypto market health (BTC, ETH as risk-on indicators)
- Economic calendar integration (Fed meetings, CPI releases)
- Earnings calendar for Tier 6 stocks

**Cost-Benefit Analysis for Backend:**

| Approach | Cost | Pros | Cons |
|----------|------|------|------|
| **Current (Client-side)** | $0/mo | Zero cost, simple | API keys exposed |
| **Cloudflare Workers** | $0-5/mo | Hide keys, 100k req/day free | Adds complexity |
| **Vercel Functions** | $0-20/mo | Easy setup, 100GB bandwidth free | Vendor lock-in |
| **Self-hosted (Railway)** | $5/mo | Full control, PostgreSQL | Maintenance burden |

---

## 13. Definition of Done

A feature is considered complete when:
- [ ] Code reviewed and merged
- [ ] Unit tests passing (>70% coverage)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Lighthouse score >90
- [ ] Documented in README
- [ ] Deployed to staging (gh-pages branch)
- [ ] Accessibility audit passed

---

**Document Owner:** Engineering Team
**Approval Required:** Product Owner, Tech Lead
**Next Review:** After Phase 1 completion
