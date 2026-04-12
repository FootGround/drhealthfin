#!/usr/bin/env node

/**
 * Market Data Fetcher for GitHub Actions
 *
 * Fetches market data from Finnhub, Twelve Data, Yahoo Finance, and FRED APIs.
 * Saves to public/market-data.json for static hosting.
 *
 * Environment variables required:
 * - FINNHUB_API_KEY
 * - TWELVE_DATA_API_KEY
 * - FRED_API_KEY (optional, for credit pillar)
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
const FRED_API_KEY = process.env.FRED_API_KEY || process.env.VITE_FRED_API_KEY;

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON response from ${url}`);
        }
      }

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

function calculateSMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

// ============================================================================
// FINNHUB / TWELVE DATA (existing instrument data)
// ============================================================================

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

// ============================================================================
// YAHOO FINANCE (server-side, no CORS issues)
// ============================================================================

async function fetchYahooChart(symbol, range = '1y', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const data = await fetchWithRetry(url);
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(`No data for ${symbol}`);
    return result;
  } catch (err) {
    console.error(`❌ Yahoo Finance failed for ${symbol}:`, err.message);
    return null;
  }
}

function extractClosePrices(yahooResult) {
  if (!yahooResult?.indicators?.quote?.[0]?.close) return [];
  return yahooResult.indicators.quote[0].close.filter(p => p !== null);
}

// ============================================================================
// COMPASS DATA: DIRECTION PILLAR
// ============================================================================

async function fetchDirectionData() {
  console.log('\n📐 Fetching Direction pillar data (200MA)...');
  const tickers = ['SPY', 'QQQ', 'IWM'];
  const direction = {};

  for (const ticker of tickers) {
    const chart = await fetchYahooChart(ticker, '1y', '1d');
    if (chart) {
      const closes = extractClosePrices(chart);
      const currentPrice = chart.meta?.regularMarketPrice || closes[closes.length - 1] || 0;
      const ma200 = calculateSMA(closes, 200);
      const percentVs200MA = ma200 > 0 ? ((currentPrice - ma200) / ma200) * 100 : 0;

      const previousClose = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
      const dailyChange = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

      direction[ticker.toLowerCase()] = {
        price: currentPrice,
        ma200: Math.round(ma200 * 100) / 100,
        percentVs200MA: Math.round(percentVs200MA * 100) / 100,
        dailyChange: Math.round(dailyChange * 100) / 100,
      };
      console.log(`  ✅ ${ticker}: $${currentPrice.toFixed(2)}, 200MA: $${ma200.toFixed(2)}, vs200MA: ${percentVs200MA.toFixed(2)}%`);
    } else {
      direction[ticker.toLowerCase()] = { price: 0, ma200: 0, percentVs200MA: 0, dailyChange: 0 };
      console.warn(`  ⚠️  ${ticker}: using fallback`);
    }
    await sleep(300);
  }

  return direction;
}

// ============================================================================
// COMPASS DATA: VOLATILITY PILLAR
// ============================================================================

async function fetchVolatilityData() {
  console.log('\n📊 Fetching Volatility pillar data...');
  const volatility = {
    vix: { value: 18, dailyChange: 0, isContango: true },
    putCall: { ratio: 0.85, change: 0 },
  };

  // VIX
  const vixChart = await fetchYahooChart('^VIX', '5d', '1d');
  if (vixChart) {
    const closes = extractClosePrices(vixChart);
    const current = closes[closes.length - 1] || 18;
    const previous = closes.length >= 2 ? closes[closes.length - 2] : current;
    volatility.vix.value = Math.round(current * 100) / 100;
    volatility.vix.dailyChange = Math.round((current - previous) * 100) / 100;
    console.log(`  ✅ VIX: ${current.toFixed(2)} (change: ${(current - previous).toFixed(2)})`);
  }
  await sleep(300);

  // VIX3M (for contango)
  const vix3mChart = await fetchYahooChart('^VIX3M', '5d', '1d');
  if (vix3mChart) {
    const closes = extractClosePrices(vix3mChart);
    const vix3m = closes[closes.length - 1] || 20;
    volatility.vix.isContango = vix3m > volatility.vix.value;
    console.log(`  ✅ VIX3M: ${vix3m.toFixed(2)} (contango: ${volatility.vix.isContango})`);
  }
  await sleep(300);

  // Put/Call Ratio
  const pcChart = await fetchYahooChart('^PCCE', '5d', '1d');
  if (pcChart) {
    const closes = extractClosePrices(pcChart);
    const current = closes[closes.length - 1] || 0.85;
    const previous = closes.length >= 2 ? closes[closes.length - 2] : current;
    volatility.putCall.ratio = Math.round(current * 1000) / 1000;
    volatility.putCall.change = Math.round((current - previous) * 1000) / 1000;
    console.log(`  ✅ Put/Call: ${current.toFixed(3)} (change: ${(current - previous).toFixed(3)})`);
  }

  return volatility;
}

// ============================================================================
// COMPASS DATA: BREADTH PILLAR
// ============================================================================

async function fetchBreadthData() {
  console.log('\n📊 Fetching Breadth pillar data...');

  const breadth = {
    advancers: 1800,
    decliners: 1200,
    percentAbove200MA: 60,
    percentAbove200MAChange: 0,
    newHighs: 75,
    newLows: 30,
  };

  // NYSE advance/decline line
  const nyadChart = await fetchYahooChart('^NYAD', '5d', '1d');
  if (nyadChart) {
    const closes = extractClosePrices(nyadChart);
    if (closes.length >= 2) {
      const current = closes[closes.length - 1];
      const previous = closes[closes.length - 2];
      const change = current - previous;
      if (change > 0) {
        breadth.advancers = 2000 + Math.min(Math.round(change / 10), 1000);
        breadth.decliners = 3000 - breadth.advancers;
      } else {
        breadth.decliners = 2000 + Math.min(Math.round(Math.abs(change) / 10), 1000);
        breadth.advancers = 3000 - breadth.decliners;
      }
      console.log(`  ✅ A/D Line: advancers=${breadth.advancers}, decliners=${breadth.decliners}`);
    }
  }
  await sleep(300);

  // Estimate % above 200MA using a compact basket (sector ETFs as proxies)
  // Sector ETFs are more reliable than individual stocks and fewer API calls
  const basket = ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE'];
  let aboveMA200 = 0;
  let total = 0;

  for (const ticker of basket) {
    const chart = await fetchYahooChart(ticker, '1y', '1d');
    if (chart) {
      const closes = extractClosePrices(chart);
      const currentPrice = chart.meta?.regularMarketPrice || closes[closes.length - 1] || 0;
      const ma200 = calculateSMA(closes, 200);
      if (currentPrice > ma200) aboveMA200++;
      total++;
    }
    await sleep(300);
  }

  if (total > 0) {
    breadth.percentAbove200MA = Math.round((aboveMA200 / total) * 100);
    console.log(`  ✅ Above 200MA: ${aboveMA200}/${total} = ${breadth.percentAbove200MA}%`);
  }

  return breadth;
}

// ============================================================================
// COMPASS DATA: CREDIT PILLAR (FRED API)
// ============================================================================

async function fetchFREDSeries(seriesId) {
  if (!FRED_API_KEY) return null;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&limit=5&sort_order=desc`;
  try {
    const data = await fetchWithRetry(url);
    if (!data.observations?.length) return null;
    const values = [];
    for (const obs of data.observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val) && obs.value !== '.') {
        values.push(val);
        if (values.length >= 2) break;
      }
    }
    return values;
  } catch (err) {
    console.error(`❌ FRED failed for ${seriesId}:`, err.message);
    return null;
  }
}

async function fetchCreditData() {
  console.log('\n📊 Fetching Credit pillar data (FRED)...');

  const credit = {
    treasury10Y: 4.15,
    treasury2Y: 3.95,
    yieldCurveSpread: 0.20,
    yieldCurveChange: 0,
    hySpread: 3.5,
    hySpreadChange: 0,
    igSpread: 1.2,
    igSpreadChange: 0,
  };

  if (!FRED_API_KEY) {
    console.warn('  ⚠️  No FRED_API_KEY, using fallback credit data');
    return credit;
  }

  const [dgs10, dgs2, hy, ig] = await Promise.all([
    fetchFREDSeries('DGS10'),
    fetchFREDSeries('DGS2'),
    fetchFREDSeries('BAMLH0A0HYM2'),
    fetchFREDSeries('BAMLC0A4CBBB'),
  ]);

  if (dgs10?.length) {
    credit.treasury10Y = dgs10[0];
    console.log(`  ✅ 10Y Treasury: ${dgs10[0]}%`);
  }
  if (dgs2?.length) {
    credit.treasury2Y = dgs2[0];
    console.log(`  ✅ 2Y Treasury: ${dgs2[0]}%`);
  }
  if (dgs10?.length && dgs2?.length) {
    credit.yieldCurveSpread = Math.round((dgs10[0] - dgs2[0]) * 100) / 100;
    if (dgs10.length >= 2 && dgs2.length >= 2) {
      const prevSpread = dgs10[1] - dgs2[1];
      credit.yieldCurveChange = Math.round((credit.yieldCurveSpread - prevSpread) * 100) / 100;
    }
    console.log(`  ✅ Yield Curve: ${credit.yieldCurveSpread}% (change: ${credit.yieldCurveChange})`);
  }
  if (hy?.length) {
    credit.hySpread = hy[0];
    if (hy.length >= 2) credit.hySpreadChange = Math.round((hy[0] - hy[1]) * 100) / 100;
    console.log(`  ✅ HY Spread: ${hy[0]}% (change: ${credit.hySpreadChange})`);
  }
  if (ig?.length) {
    credit.igSpread = ig[0];
    if (ig.length >= 2) credit.igSpreadChange = Math.round((ig[0] - ig[1]) * 100) / 100;
    console.log(`  ✅ IG Spread: ${ig[0]}% (change: ${credit.igSpreadChange})`);
  }

  return credit;
}

// ============================================================================
// COMPASS DATA: SENTIMENT PILLAR
// ============================================================================

async function fetchSentimentData() {
  console.log('\n📊 Fetching Sentiment pillar data...');

  const sentiment = {
    fearGreed: 50,
    fearGreedChange: 0,
    bulls: 35,
    bears: 30,
    bullsChange: 0,
    bearsChange: 0,
  };

  // CNN Fear & Greed
  try {
    const data = await fetchWithRetry('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');
    if (data?.fear_and_greed) {
      sentiment.fearGreed = Math.round(data.fear_and_greed.score);
      const prev = data.fear_and_greed.previous_close || sentiment.fearGreed;
      sentiment.fearGreedChange = Math.round(sentiment.fearGreed - prev);
      console.log(`  ✅ Fear & Greed: ${sentiment.fearGreed} (change: ${sentiment.fearGreedChange})`);
    }
  } catch (err) {
    console.warn(`  ⚠️  Fear & Greed failed: ${err.message}`);
  }

  // AAII Sentiment - no free API, use static fallback
  const aaiiPath = path.join(__dirname, '..', 'public', 'data', 'aaii-sentiment.json');
  try {
    if (fs.existsSync(aaiiPath)) {
      const aaii = JSON.parse(fs.readFileSync(aaiiPath, 'utf-8'));
      sentiment.bulls = aaii.bullish || sentiment.bulls;
      sentiment.bears = aaii.bearish || sentiment.bears;
      sentiment.bullsChange = aaii.bullishChange || 0;
      sentiment.bearsChange = aaii.bearishChange || 0;
      console.log(`  ✅ AAII (from file): bulls=${sentiment.bulls}%, bears=${sentiment.bears}%`);
    } else {
      console.warn('  ⚠️  AAII: no static file, using defaults');
    }
  } catch (err) {
    console.warn(`  ⚠️  AAII file error: ${err.message}`);
  }

  return sentiment;
}

// ============================================================================
// COMPASS DATA: GLOBAL PILLAR
// ============================================================================

async function fetchGlobalData() {
  console.log('\n📊 Fetching Global pillar data...');

  const global = {
    acwi: { price: 110, percentVs50MA: 1.0, dailyChange: 0 },
    vstoxx: { value: 17, change: 0 },
    pmi: { value: 52, change: 0 },
  };

  // ACWI (MSCI World)
  const acwiChart = await fetchYahooChart('ACWI', '3mo', '1d');
  if (acwiChart) {
    const closes = extractClosePrices(acwiChart);
    const currentPrice = acwiChart.meta?.regularMarketPrice || closes[closes.length - 1] || 0;
    const ma50 = calculateSMA(closes, 50);
    const percentVs50MA = ma50 > 0 ? ((currentPrice - ma50) / ma50) * 100 : 0;
    const previousClose = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
    const dailyChange = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

    global.acwi = {
      price: Math.round(currentPrice * 100) / 100,
      percentVs50MA: Math.round(percentVs50MA * 100) / 100,
      dailyChange: Math.round(dailyChange * 100) / 100,
    };
    console.log(`  ✅ ACWI: $${currentPrice.toFixed(2)}, vs50MA: ${percentVs50MA.toFixed(2)}%`);
  }
  await sleep(300);

  // VSTOXX
  const vstoxxChart = await fetchYahooChart('^VSTOXX', '5d', '1d');
  if (vstoxxChart) {
    const closes = extractClosePrices(vstoxxChart);
    const current = closes[closes.length - 1] || 17;
    const previous = closes.length >= 2 ? closes[closes.length - 2] : current;
    global.vstoxx = {
      value: Math.round(current * 100) / 100,
      change: Math.round((current - previous) * 100) / 100,
    };
    console.log(`  ✅ VSTOXX: ${current.toFixed(2)} (change: ${(current - previous).toFixed(2)})`);
  }
  await sleep(300);

  // PMI - static/monthly
  const pmiPath = path.join(__dirname, '..', 'public', 'data', 'global-pmi.json');
  try {
    if (fs.existsSync(pmiPath)) {
      const pmiData = JSON.parse(fs.readFileSync(pmiPath, 'utf-8'));
      global.pmi = {
        value: pmiData.value || 52,
        change: pmiData.change || 0,
      };
      console.log(`  ✅ PMI (from file): ${global.pmi.value} (change: ${global.pmi.change})`);
    } else {
      console.warn('  ⚠️  PMI: no static file, using default');
    }
  } catch (err) {
    console.warn(`  ⚠️  PMI file error: ${err.message}`);
  }

  return global;
}

// ============================================================================
// MARKET HOURS
// ============================================================================

function getEasternTimeComponents(date = new Date()) {
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
  const getValue = (type) => parts.find(p => p.type === type)?.value || '';

  return {
    hour: parseInt(getValue('hour'), 10),
    minute: parseInt(getValue('minute'), 10),
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(getValue('weekday')),
  };
}

function isMarketOpen() {
  const { hour, minute, day } = getEasternTimeComponents();
  if (day === 0 || day === 6) return false;
  if (hour < 9 || hour > 16) return false;
  if (hour === 9 && minute < 30) return false;
  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Starting market data fetch...');
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`📊 Market Status: ${isMarketOpen() ? 'OPEN' : 'CLOSED'}`);

  const results = {
    lastUpdated: new Date().toISOString(),
    marketOpen: isMarketOpen(),
    instruments: {},
    compassData: null,
  };

  // ── Fetch instrument quotes (existing behavior) ──
  console.log(`\n📈 Fetching quotes for ${INSTRUMENTS.length} instruments...`);
  for (const instrument of INSTRUMENTS) {
    const quote = await fetchQuote(instrument.ticker, instrument.apiSymbol);
    if (quote && quote.currentPrice) {
      results.instruments[instrument.ticker] = quote;
      console.log(`✅ ${instrument.ticker}: $${quote.currentPrice.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    } else {
      console.warn(`⚠️  Skipping ${instrument.ticker} - incomplete data`);
    }
    await sleep(100);
  }

  // ── Fetch sparklines (existing behavior) ──
  console.log('\n📊 Fetching historical data...');
  const historicalTickers = ['SPY', 'QQQ', 'IWM', 'VIXY', 'IEF'];
  for (const ticker of historicalTickers) {
    const instrument = INSTRUMENTS.find(i => i.ticker === ticker);
    if (!instrument) continue;
    const historical = await fetchHistorical(ticker, instrument.apiSymbol);
    if (historical.length > 0) {
      if (!results.instruments[ticker]) results.instruments[ticker] = {};
      results.instruments[ticker].sparkline = historical;
      console.log(`✅ ${ticker}: ${historical.length} data points`);
    }
    await sleep(200);
  }

  // ── Fetch Market Compass data (NEW) ──
  // Run sequentially to avoid Yahoo Finance rate limiting from CI runners
  console.log('\n🧭 Fetching Market Compass data...');

  try {
    const direction = await fetchDirectionData();
    const volatility = await fetchVolatilityData();
    const breadth = await fetchBreadthData();
    // Credit + Sentiment don't use Yahoo, safe to parallelize
    const [credit, sentiment] = await Promise.all([
      fetchCreditData(),
      fetchSentimentData(),
    ]);
    const global = await fetchGlobalData();

    results.compassData = {
      direction,
      volatility,
      breadth,
      credit,
      sentiment,
      global,
    };
  } catch (err) {
    console.error('⚠️  Compass data fetch failed, saving without compass data:', err.message);
    // Still save instrument data even if compass fails
  }

  // ── Save to file ──
  const outputPath = path.join(__dirname, '..', 'public', 'market-data.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Market data saved to ${outputPath}`);
  console.log(`📊 Total instruments: ${Object.keys(results.instruments).length}`);
  console.log(`🧭 Compass pillars: ${results.compassData ? Object.keys(results.compassData).length : 0}`);
  console.log('🎉 Done!');
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
