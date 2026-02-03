#!/usr/bin/env node

/**
 * Market Data Fetcher for GitHub Actions
 *
 * This script fetches market data from Finnhub and Twelve Data APIs
 * and saves it to public/market-data.json for static hosting.
 *
 * Environment variables required:
 * - FINNHUB_API_KEY
 * - TWELVE_DATA_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY;

if (!FINNHUB_API_KEY || !TWELVE_DATA_API_KEY) {
  console.error('❌ Error: API keys not found in environment variables');
  console.error('Required: FINNHUB_API_KEY, TWELVE_DATA_API_KEY');
  process.exit(1);
}

// Instrument definitions (must match src/constants/instruments.ts)
const INSTRUMENTS = [
  // Tier 1
  { ticker: 'SPY', apiSymbol: 'SPY' },
  { ticker: 'QQQ', apiSymbol: 'QQQ' },
  { ticker: 'IWM', apiSymbol: 'IWM' },
  { ticker: 'VIXY', apiSymbol: 'VIXY' },
  { ticker: 'IEF', apiSymbol: 'IEF' },

  // Tier 2
  { ticker: 'URTH', apiSymbol: 'URTH' },
  { ticker: 'ACWI', apiSymbol: 'ACWI' },
  { ticker: 'DJIA', apiSymbol: '^DJI' },

  // Tier 3
  { ticker: 'RSP', apiSymbol: 'RSP' },
  { ticker: 'VTV', apiSymbol: 'VTV' },
  { ticker: 'VUG', apiSymbol: 'VUG' },

  // Tier 4
  { ticker: 'XLK', apiSymbol: 'XLK' },
  { ticker: 'XLF', apiSymbol: 'XLF' },
  { ticker: 'XLE', apiSymbol: 'XLE' },
  { ticker: 'XLV', apiSymbol: 'XLV' },
  { ticker: 'XLY', apiSymbol: 'XLY' },
  { ticker: 'XLP', apiSymbol: 'XLP' },

  // Tier 5
  { ticker: 'DXY', apiSymbol: 'DX-Y.NYB' },
  { ticker: 'WTI', apiSymbol: 'CL=F' },
  { ticker: 'GLD', apiSymbol: 'GC=F' },

  // Tier 6
  { ticker: 'AAPL', apiSymbol: 'AAPL' },
  { ticker: 'MSFT', apiSymbol: 'MSFT' },
  { ticker: 'NVDA', apiSymbol: 'NVDA' },
  { ticker: 'AMZN', apiSymbol: 'AMZN' },
  { ticker: 'JPM', apiSymbol: 'JPM' },
];

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }

      // Rate limited - wait and retry
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`⏳ Rate limited, waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch quote from Finnhub
 */
async function fetchQuote(ticker, apiSymbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${apiSymbol}&token=${FINNHUB_API_KEY}`;

  try {
    const data = await fetchWithRetry(url);

    return {
      ticker,
      currentPrice: data.c,
      change: data.c - data.pc,
      changePercent: ((data.c - data.pc) / data.pc) * 100,
      previousClose: data.pc,
      high: data.h,
      low: data.l,
      open: data.o,
    };
  } catch (err) {
    console.error(`❌ Failed to fetch ${ticker}:`, err.message);
    return null;
  }
}

/**
 * Fetch historical data from Twelve Data
 */
async function fetchHistorical(ticker, apiSymbol, interval = '5min', outputsize = 20) {
  const url = `https://api.twelvedata.com/time_series?symbol=${apiSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

  try {
    const data = await fetchWithRetry(url);

    if (!data.values || data.values.length === 0) {
      console.warn(`⚠️  No historical data for ${ticker}`);
      return [];
    }

    return data.values.map(v => parseFloat(v.close)).reverse();
  } catch (err) {
    console.error(`❌ Failed to fetch historical data for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Check if market is open (US market hours)
 */
function isMarketOpen() {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hour = eastern.getHours();
  const day = eastern.getDay();
  const minutes = eastern.getMinutes();

  // Weekend
  if (day === 0 || day === 6) return false;

  // Weekday 9:30 AM - 4:00 PM ET
  if (hour < 9 || hour > 16) return false;
  if (hour === 9 && minutes < 30) return false;

  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting market data fetch...');
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`📊 Market Status: ${isMarketOpen() ? 'OPEN' : 'CLOSED'}`);

  const results = {
    lastUpdated: new Date().toISOString(),
    marketOpen: isMarketOpen(),
    instruments: {},
  };

  // Fetch quotes for all instruments
  console.log(`\n📈 Fetching quotes for ${INSTRUMENTS.length} instruments...`);

  for (const instrument of INSTRUMENTS) {
    const quote = await fetchQuote(instrument.ticker, instrument.apiSymbol);

    if (quote && quote.currentPrice) {
      results.instruments[instrument.ticker] = quote;
      console.log(`✅ ${instrument.ticker}: $${quote.currentPrice.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    } else {
      console.warn(`⚠️  Skipping ${instrument.ticker} - incomplete data`);
    }

    // Rate limiting: wait between requests
    await sleep(100);
  }

  // Fetch historical data for key instruments (sparklines)
  console.log('\n📊 Fetching historical data...');
  const historicalTickers = ['SPY', 'QQQ', 'IWM', 'VIXY', 'IEF'];

  for (const ticker of historicalTickers) {
    const instrument = INSTRUMENTS.find(i => i.ticker === ticker);
    if (!instrument) continue;

    const historical = await fetchHistorical(ticker, instrument.apiSymbol);

    if (historical.length > 0) {
      if (!results.instruments[ticker]) {
        results.instruments[ticker] = {};
      }
      results.instruments[ticker].sparkline = historical;
      console.log(`✅ ${ticker}: ${historical.length} data points`);
    }

    await sleep(200); // Longer wait for Twelve Data
  }

  // Save to file
  const outputPath = path.join(__dirname, '..', 'public', 'market-data.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Market data saved to ${outputPath}`);
  console.log(`📊 Total instruments: ${Object.keys(results.instruments).length}`);
  console.log('🎉 Done!');
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
