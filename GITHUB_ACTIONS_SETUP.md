# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions to securely fetch market data without exposing API keys.

## Why GitHub Actions?

Your current setup exposes API keys in the client-side JavaScript, which is a **security risk** for a public repository. The GitHub Actions approach solves this by:

1. **Secure**: API keys stay in GitHub Secrets, never exposed to users
2. **Free**: Uses ~1,040 minutes/month (well under the 2,000 minute free tier)
3. **Fast**: Data is pre-fetched, so users get instant page loads
4. **Reliable**: No rate limit concerns for end users

## Setup Steps

### 1. Configure GitHub Secrets

Go to your repository's Settings → Secrets and variables → Actions → New repository secret:

#### Required Secrets:

**`FINNHUB_API_KEY`**
- Value: `d5voon9r01qihi8n7epgd5voon9r01qihi8n7eq0` (your current key from `.env`)
- Get a new key at: https://finnhub.io/register

**`TWELVE_DATA_API_KEY`**
- Value: `9f80cfcf02b34239b1feab2b3f77310e` (your current key from `.env`)
- Get a new key at: https://twelvedata.com/pricing

### 2. Verify Workflows Are Enabled

1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select **Allow all actions and reusable workflows**
3. Under **Workflow permissions**, select **Read and write permissions**
4. Click **Save**

### 3. Test the Workflow

#### Manual Test:
1. Go to **Actions** tab
2. Select **Update Market Data** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait ~1-2 minutes
5. Check the **Summary** for results

#### Automatic Schedule:
The workflow runs automatically:
- Every 15 minutes during US market hours (9:30 AM - 4:00 PM ET)
- Monday through Friday
- Skips weekends and after-hours

### 4. Verify Data File

After the workflow runs:
1. Check that `public/market-data.json` was created/updated
2. The file should contain data for ~25 instruments
3. Frontend will automatically use this file (no code changes needed!)

## How It Works

### Data Flow:

```
┌─────────────────────────────────────┐
│ GitHub Actions (Every 15 min)      │
│                                     │
│ 1. Fetch data from APIs            │
│    (using secrets)                  │
│ 2. Save to public/market-data.json │
│ 3. Commit and push                  │
└─────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│ GitHub Pages Deploy Workflow        │
│                                     │
│ 1. Build React app                  │
│ 2. Include market-data.json         │
│ 3. Deploy to GitHub Pages           │
└─────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│ User's Browser                      │
│                                     │
│ 1. Loads React app                  │
│ 2. Fetches /market-data.json        │
│ 3. Displays data (NO API KEYS!)    │
└─────────────────────────────────────┘
```

### Fallback Strategy:

The app uses a **hybrid approach**:

1. **Primary**: Static data from `public/market-data.json` (secure, fast)
2. **Fallback 1**: LocalStorage cache (persists across refreshes)
3. **Fallback 2**: IndexedDB cache (for historical data)
4. **Fallback 3**: Direct API calls (only if static data fails)

This means:
- Users almost never hit the API directly
- No API keys exposed
- Works offline (with cached data)
- Instant page loads

## Monitoring

### Check Workflow Status:
- Go to **Actions** tab
- View recent runs and their logs
- Each run shows which instruments succeeded/failed

### Check Data Freshness:
The app displays data age in the UI (coming soon in next update).

### API Usage:
Monitor your API usage at:
- Finnhub: https://finnhub.io/dashboard
- Twelve Data: https://twelvedata.com/account

Expected usage:
- **Finnhub**: ~26 calls per workflow run (650/day during market hours)
- **Twelve Data**: ~5 calls per workflow run (125/day during market hours)

Both well under free tier limits!

## Troubleshooting

### Workflow Failed?

**Check logs:**
1. Go to Actions tab
2. Click on the failed workflow run
3. Expand "Fetch market data" step
4. Look for error messages

**Common issues:**
- **Invalid API key**: Double-check secrets are correct
- **Rate limited**: Workflow waits and retries automatically
- **Network error**: Temporary, will succeed on next run
- **Missing permissions**: Verify workflow permissions (Step 2 above)

### Data Not Updating?

**Check:**
1. Is the workflow running? (Actions tab)
2. Is `public/market-data.json` in the repo?
3. Did the deployment succeed?
4. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### "Insufficient data available" error?

This was the original issue! It's now fixed:
- Updated health calculator to look for `VIXY` (not `VIX`)
- Static data includes all required instruments
- Fallback to API if static data is unavailable

## Cost Analysis

### GitHub Actions Minutes:

**Per workflow run:**
- Fetch data: ~2 minutes
- Build and deploy: Triggered separately, not counted here

**Per day (market hours only):**
- Runs: 26 times (every 15 min × 6.5 hours)
- Minutes used: 26 × 2 = **52 minutes/day**

**Per month:**
- Trading days: ~20
- Total minutes: 52 × 20 = **1,040 minutes/month**

**Result:** Well under the 2,000 minute free tier! ✅

### API Calls:

**Finnhub** (60 calls/min limit):
- Calls per run: ~25 quotes
- Calls per day: 650
- **Well under limit** ✅

**Twelve Data** (800 calls/day limit):
- Calls per run: ~5 historical
- Calls per day: 130
- **Well under limit** ✅

## Security Best Practices

### ✅ DO:
- Keep API keys in GitHub Secrets
- Rotate keys every 3-6 months
- Monitor usage dashboards
- Use minimal permissions

### ❌ DON'T:
- Commit API keys to the repository
- Share secrets outside GitHub
- Use keys with billing attached (use free tiers)
- Skip the static data approach

## Next Steps

After setup:
1. Verify workflow runs successfully
2. Check that app loads data from JSON file
3. Monitor API usage for first few days
4. Consider adding alerts for workflow failures (GitHub Actions → Settings → Notifications)

## Need Help?

- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Workflow syntax**: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **Secrets management**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**You're all set!** 🎉 Your market data is now secure, fast, and free.
