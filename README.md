# Market Compass 📊

A real-time financial market health dashboard built with React, TypeScript, and Tailwind CSS. Democratizing market insights through semantic visualization.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Market Health Score** - Single 0-100 score synthesizing overall market conditions
- **Real-time data** - Updates every 15-60 seconds via Finnhub & Twelve Data APIs
- **Zero cost** - 100% free to run (GitHub Pages + free API tiers)
- **Semantic visualization** - Traffic lights, not data tables
- **Dark mode** - Easy on the eyes
- **Focus mode** - Minimalist view showing only Tier 1 metrics
- **Responsive** - Works on mobile, tablet, desktop
- **Accessible** - Full keyboard navigation and screen reader support

## Market Health Score

Market Compass now features a **Market Health Score** (0-100) that simplifies complex market conditions into a single, easy-to-understand number.

### What It Means

The health score provides an at-a-glance answer to: *"Is the market healthy today?"*

| Score Range | Status | Indicator | Meaning |
|-------------|--------|-----------|---------|
| **80-100** | Very Healthy | 🟢 | Strong gains, low volatility, risk-on sentiment |
| **60-79** | Healthy | 🟢 | Normal positive conditions, steady markets |
| **40-59** | Neutral | ⚪ | Mixed signals, choppy trading |
| **25-39** | Unhealthy | 🟠 | Elevated stress, declining conditions |
| **0-24** | Very Unhealthy | 🔴 | High volatility, widespread weakness |

### How It's Calculated

The score combines three key market indicators:

1. **Market Direction (40%)** - Performance of major indices (SPY, QQQ)
2. **Risk Appetite (30%)** - Small-cap strength relative to large-caps (IWM vs SPY)
3. **Volatility (30%)** - Market stress level (inverse VIX)

Each component is normalized to a 0-100 scale and weighted to produce the final score. The algorithm also compares today's score to yesterday's, showing whether conditions are improving or declining.

### Features

- **Yesterday Comparison** - See how today's health compares to yesterday (↑ Improving / ↓ Declining)
- **Component Breakdown** - Expand to see individual scores for each factor
- **Smart Descriptions** - Natural language explanation of what's driving the score
- **Error Resilience** - Gracefully handles missing data or API issues
- **Real-time Updates** - Score recalculates automatically when market data refreshes

### Example

```
Market Health: 78/100
🟢 Healthy (↑ Improving)

Yesterday: 65  ↑ 13 points

"Healthy conditions with rising markets"

▼ See calculation details
  Market Direction (40%):  82/100
  Risk Appetite (30%):     75/100
  Low Volatility (30%):    73/100
```

## Quick Start

### 1. Get API Keys (5 minutes, free)

**Finnhub** (real-time quotes):
1. Visit https://finnhub.io/register
2. Sign up (no credit card required)
3. Copy your API key

**Twelve Data** (historical data):
1. Visit https://twelvedata.com/pricing
2. Click "Get Free API Key"
3. Copy your API key

### 2. Local Development

```bash
# Clone the repo
git clone <your-repo-url>
cd financial-dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your API keys to .env
# VITE_FINNHUB_API_KEY=your_key_here
# VITE_TWELVE_DATA_API_KEY=your_key_here

# Start dev server
npm run dev
```

Visit http://localhost:3000

### 3. Deploy to GitHub Pages

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# Add API keys to GitHub Secrets
# 1. Go to your repository on GitHub
# 2. Settings → Secrets and variables → Actions
# 3. New repository secret:
#    Name: FINNHUB_API_KEY
#    Value: <your-finnhub-key>
# 4. New repository secret:
#    Name: TWELVE_DATA_API_KEY
#    Value: <your-twelve-data-key>

# Enable GitHub Pages
# 1. Settings → Pages
# 2. Source: GitHub Actions
# 3. Save

# Workflow will deploy automatically on push to main
```

Your dashboard will be live at: `https://<username>.github.io/<repo-name>`

## Project Structure

```
financial-dashboard/
├── src/
│   ├── components/        # React components (to be built)
│   ├── constants/         # Instrument definitions, API config
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API clients, rate limiters
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Helper functions
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions deployment
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Architecture

**100% client-side** - No backend, no serverless functions, completely free to run.

```
Browser → Finnhub API (60 calls/min)
        → Twelve Data API (800 calls/day)
        → In-memory cache (15s TTL)
        → Zustand store
        → React components
```

**Update Strategy:**
- Tier 1 (SPY, QQQ, IWM, VIX, 10Y): Every 15 seconds
- Tiers 2-6: Every 60 seconds
- After market hours: Slower updates to conserve API calls

## API Usage

| Timeframe | Finnhub Calls | Twelve Data Calls |
|-----------|---------------|-------------------|
| Per minute | 36 (60% of limit) | ~4 |
| Per hour | 2,160 | 240 |
| Per day | ~20,000 (market hours) | ~2,880 |

**Both well under free tier limits** ✓

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **Hosting**: GitHub Pages

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests (Vitest)
npm run lint         # Lint code
```

## Customization

### Adding New Instruments

Edit `src/constants/instruments.ts`:

```typescript
{
  ticker: 'TSLA',
  name: 'Tesla',
  tier: 6,
  category: 'equity',
  tooltip: 'Tesla - EV leader',
}
```

### Changing Update Intervals

Edit `src/constants/apiConfig.ts`:

```typescript
export const UPDATE_INTERVALS = {
  tier1: 15000,      // milliseconds
  standard: 60000,
};
```

## Troubleshooting

**"API Error" message:**
- Check that your API keys are correct in `.env` or GitHub Secrets
- Verify keys are active at Finnhub/Twelve Data dashboards

**Data not updating:**
- Check browser console for errors
- Ensure API rate limits aren't exceeded
- Verify network connectivity

**Build fails in GitHub Actions:**
- Ensure secrets `FINNHUB_API_KEY` and `TWELVE_DATA_API_KEY` are set
- Check Actions tab for detailed error logs

## Roadmap

### Completed ✅
- [x] **Market Health Score** - Single 0-100 score with component breakdown
- [x] Dark mode support
- [x] Focus mode (Tier 1 only view)
- [x] Responsive design
- [x] Accessibility (WCAG AA compliant)

### Planned
- [ ] 7-day health trend sparkline
- [ ] Share image generator for social media
- [ ] Complete Tier 2-6 components
- [ ] VIX gauge visualization
- [ ] Ratio bars (Value/Growth, Discretionary/Staples)
- [ ] Timeframe toggle (1D, 1W, 1M, YTD)
- [ ] Push notifications for significant health changes
- [ ] Historical health archive (30-day trend)
- [ ] Sector-level health scores
- [ ] News integration
- [ ] Mobile app (React Native)

## Contributing

Contributions welcome! Please open an issue first to discuss changes.

## License

MIT

## Credits

Built following the technical requirements in [TECHNICAL_REQUIREMENTS.md](./TECHNICAL_REQUIREMENTS.md).

Data provided by:
- [Finnhub](https://finnhub.io)
- [Twelve Data](https://twelvedata.com)
