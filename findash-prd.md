This is a great project. Hosting on GitHub Pages implies a static site architecture (HTML/JS/CSS), which limits backend processing but is perfect for a cost-effective, client-side data fetching dashboard.

Below is a comprehensive **Product Requirements Document (PRD)** tailored for a developer to build this specific vision.

---

# Product Requirements Document (PRD)

**Project Name:** Market Compass (Working Title)
**Version:** 1.0
**Platform:** Web (GitHub Pages)
**Target Audience:** Retail investors, casual observers, non-financial professionals.

---

## 1. Executive Summary

"Market Compass" is a free, open-source dashboard designed to democratize financial market health. Unlike traditional terminals (Bloomberg) or cluttered portals (Yahoo Finance), this dashboard prioritizes **semantic visualization**. It translates complex financial proxies into an "at a glance" status report using meaningful visual metaphors (Traffic lights, Thermometers, Weather) rather than dense data tables.

## 2. Core Principles

* **Zero Jargon:** Labels must use plain English alongside tickers (e.g., "Fear Gauge" instead of just "VIX").
* **Visual First:** Trends are recognized via color and shape, not just raw numbers.
* **Minimalist:** White space is a feature. Do not overwhelm the user.
* **Contextual:** Every data point must answer "Why does this matter?"

---

## 3. Data Architecture & Proxies

The dashboard will pull data for the following instruments.
*Note: Since this is hosted on GitHub Pages, data will be fetched client-side via free APIs (e.g., Yahoo Finance unofficial API, AlphaVantage, or Finnhub free tiers).*

### Tier 1: The "Minimalist" Header (Sticky / Top Fold)

*The "50,000 foot view." These 5 metrics are always visible.*

1. **SPY:** Label: "US Market" | visual: Trend Line.
2. **QQQ:** Label: "Growth/Tech" | visual: Trend Line.
3. **IWM:** Label: "Risk Appetite" | visual: Trend Line.
4. **10Y Yield:** Label: "Valuation Pressure" | visual: Inverse Scale (High yield = Red/Warning).
5. **VIX:** Label: "Market Stress" | visual: Gauge/Speedometer.

### Tier 2: Broad Market Barometers (The Weather)

* **US:** SPY, QQQ, DJIA.
* **Global:** URTH (Developed), ACWI (Whole World).
* **Visualization:** A "Heat Map" or "Card" view.
* *Green:* Healthy/Uptrend.
* *Red:* Stressed/Downtrend.
* *Grey:* Neutral/Flat.



### Tier 3: Style, Size & Ratios (The Engine)

* **Small Caps (IWM):** Risk-on detector.
* **Market Breadth (RSP):** Equal Weight S&P.
* **Value vs Growth (VTV / VUG):** Displayed as a Ratio Bar.
* *Left:* Value winning (Defensive).
* *Right:* Growth winning (Aggressive).



### Tier 4: Sector Pulse (The Leaders)

* **XLK (Tech):** Innovation.
* **XLF (Financials):** Economy.
* **XLE (Energy):** Inflation/Geopolitics.
* **XLV (Healthcare):** Defense.
* **The Golden Ratio (XLY / XLP):** Discretionary vs. Staples.
* *Visual:* A "Consumer Confidence" slider. High ratio = Confident consumer. Low ratio = Worried consumer.



### Tier 5: Macro & Shadow Markets (The Gravity)

* **10Y Yield:** Cost of money.
* **DXY (Dollar):** Global liquidity.
* **Oil (WTI):** Inflation signal.
* **Gold (XAU):** Fear/Insurance.
* **Visualization:** Sparklines showing 30-day trend.

### Tier 6: Single-Stock Titans (The Anchors)

* AAPL, MSFT, NVDA, AMZN, JPM.
* **Visualization:** Simple "Up/Down" pills with % change.

---

## 4. Functional Requirements

### 4.1. Dashboard Views

* **Default View:** Shows all sections in a grid layout.
* **Focus Mode (Minimalist):** A toggle button that hides everything except "Tier 1" (The 5 Core Signals) for a distraction-free experience.
* **Timeframe Toggles:** Users can switch the calculation of "Health" between:
* 1 Day (Intraday sentiment)
* 1 Week (Short term trend)
* 1 Month (Medium term trend)
* YTD (The big picture)



### 4.2. Visualizations

* **The "Health" Card:** Each asset is a card containing:
* Ticker & Name.
* Current Price & % Change.
* A "Sparkline" (mini chart) of the selected timeframe.
* Background color subtly tinting Green or Red based on performance.


* **Tooltips:** Hovering over any card displays a "Plain English" explanation.
* *Example:* Hovering over **XLE**: "Energy Sector. Often rises when inflation is high or geopolitical tension exists."



### 4.3. Export & Share

* **"Snapshot" Button:** Generates a clean PNG image of the current dashboard state (using `html2canvas` or similar) for the user to download and share on social media.

---

## 5. UI/UX Design Specifications

### 5.1. Aesthetic

* **Theme:** "Glassmorphism" or "Clean Swiss."
* Light Mode: White/Off-white backgrounds, dark grey text.
* Dark Mode: Deep blue/grey backgrounds, white text (Toggle included).


* **Color Palette:**
* Positive: Soft Mint/Emerald (avoid neon green).
* Negative: Soft Coral/Rose (avoid alarmist red).
* Neutral: Slate Grey.



### 5.2. Layout

* **Responsive:** Grid must collapse from 4 columns (Desktop) to 2 columns (Tablet) to 1 column (Mobile).
* **Hierarchy:** Font size must dictate importance. The "Tier 1" metrics should be largest.

---

## 6. Technical Stack (Free & GitHub Friendly)

* **Hosting:** GitHub Pages.
* **Framework:** React (Vite) or Next.js (Static Export).
* **Styling:** Tailwind CSS (for rapid, clean styling).
* **Charts:** Recharts (React) or Chart.js (simple, lightweight).
* **Data Fetching:**
* **Option A (Easiest/Free):** Yahoo Finance API (via a proxy or client-side fetch if CORS allows, though often requires a serverless function).
* **Option B (More Stable):** Alpha Vantage (Free tier has limits, 5 calls/min).
* **Recommended Hybrid:** Use a GitHub Action to fetch data once every hour, save it to a JSON file in the repo, and have the website read that JSON. This ensures the site is fast and doesn't hit API rate limits, though data is slightly delayed (which is fine for a general health dashboard).



---

## 7. Future "Nice to Haves" (v2.0)

* **Portfolio Import:** Users enter their allocation to see a "Personal Heatmap."
* **News Ticker:** Curated headlines for the "Red" items (Why is it down?).
* **Educational Mode:** An overlay tutorial walking through what the proxies mean.