# Property Value Tracking Setup Guide

## Overview

Track real estate property values over time on your Vestaboard, displaying them similar to stock prices with value changes, percentage indicators, and color-coded trends.

**Perfect for:**
- Tracking your home's value
- Monitoring rental property investments
- Watching real estate portfolios
- Comparing property appreciation

## Features

- 📊 **Track 1-3 Properties** - Monitor multiple properties simultaneously
- 📈 **Historical Tracking** - Build your own value history dataset over time
- 🎨 **Color-Coded Display** - Green for value increases, red for decreases
- 📅 **Flexible Time Windows** - Compare values across 1 week to 1 year
- 🆓 **Free API** - Uses unofficial Redfin API (no API key required)
- 💾 **Local Persistence** - Historical data stored locally in `/app/data/`

## Display Format

```
{center}PROPERTY VALUES
HOME{green} $1.25M +4.2%
RENTAL{red} $850K -2.1%
Total: $2.10M +2.8%
```

## Prerequisites

### Option 1: Unofficial Redfin API (Recommended)
- **Cost:** Free
- **API Key:** Not required
- **Coverage:** All US properties on Redfin
- **Reliability:** Good (unofficial, may break)
- **Setup Time:** < 5 minutes

### Option 2: Manual Entry (Testing/Fallback)
- **Cost:** Free
- **API Key:** Not required
- **Coverage:** Any property
- **Reliability:** Perfect (you control it)
- **Setup Time:** Instant

### Option 3: RapidAPI / Realty Mole (Paid Alternative)
- **Cost:** $10-50/month
- **API Key:** Required
- **Coverage:** All US properties
- **Reliability:** Excellent
- **Setup Time:** 10-15 minutes

## Quick Setup (Using Redfin API)

### Step 1: Enable Property Tracking

Edit your `.env` file or configure via Web UI:

```bash
PROPERTY_ENABLED=true
PROPERTY_API_PROVIDER=redfin  # Free, no key needed
PROPERTY_TIME_WINDOW=1 Month
PROPERTY_REFRESH_SECONDS=86400  # Check once per day
```

### Step 2: Add Properties to Track

**Via Environment Variable:**

```bash
PROPERTY_ADDRESSES='[
  {"address": "123 Main St, San Francisco, CA 94102", "display_name": "HOME"},
  {"address": "456 Oak Ave, Berkeley, CA 94704", "display_name": "RENTAL"}
]'
```

**Via Web UI (Recommended):**

1. Open http://localhost:8080/settings
2. Navigate to "Property Value Tracking"
3. Enable the feature
4. Click "Add Property"
5. Enter full street address (e.g., "123 Main St, San Francisco, CA 94102")
6. Enter short display name (e.g., "HOME" - max 10 chars for board)
7. Click "Validate" to verify Redfin can find the property
8. Click "Add" to save
9. Repeat for up to 3 properties

### Step 3: Restart Service

```bash
# Using Cursor commands (recommended)
/restart

# Or using Docker directly
docker-compose -f docker-compose.dev.yml restart
```

### Step 4: Add to a Page

Create or edit a page to display property values:

#### Using Pre-formatted Display:
```
{center}PROPERTY VALUES
{{property.properties.0.formatted}}
{{property.properties.1.formatted}}
{{property.properties.2.formatted}}
```

#### Using Custom Layout:
```
{center}MY REAL ESTATE
HOME: {{property.properties.0.value_str}}
Change: {{property.properties.0.change_str}}
{{property.properties.0.color}}
```

## Configuration Options

### Provider Selection

```bash
# Redfin (default, free, no API key)
PROPERTY_API_PROVIDER=redfin

# Manual entry (for testing)
PROPERTY_API_PROVIDER=manual

# RapidAPI/Realty Mole (paid, requires key)
PROPERTY_API_PROVIDER=realty_mole
PROPERTY_API_KEY=your_rapidapi_key_here
```

### Time Windows

Choose how far back to compare values:

```bash
PROPERTY_TIME_WINDOW=1 Week    # Compare to 1 week ago
PROPERTY_TIME_WINDOW=1 Month   # Compare to 1 month ago (default)
PROPERTY_TIME_WINDOW=3 Months  # Compare to 3 months ago
PROPERTY_TIME_WINDOW=6 Months  # Compare to 6 months ago
PROPERTY_TIME_WINDOW=1 Year    # Compare to 1 year ago
```

### Refresh Interval

How often to check property values:

```bash
PROPERTY_REFRESH_SECONDS=86400   # Daily (default, recommended)
PROPERTY_REFRESH_SECONDS=604800  # Weekly
PROPERTY_REFRESH_SECONDS=2592000 # Monthly
```

**Note:** Property values don't change hourly like stocks. Daily checking is sufficient and respectful to Redfin's servers.

## Template Variables

### Single Property Access

Access the first (or only) property directly:

```
{{property.display_name}}        # "HOME"
{{property.current_value}}       # 1250000
{{property.value_str}}           # "$1.25M"
{{property.change_percent}}      # 4.17
{{property.change_str}}          # "+4.2%"
{{property.color}}               # "green"
{{property.formatted}}           # "HOME{green} $1.25M +4.2%"
```

### Multiple Property Access

Access specific properties by index (0, 1, 2):

```
{{property.properties.0.formatted}}       # First property
{{property.properties.1.formatted}}       # Second property
{{property.properties.2.formatted}}       # Third property

{{property.properties.0.display_name}}    # "HOME"
{{property.properties.0.value_str}}       # "$1.25M"
{{property.properties.0.change_str}}      # "+4.2%"
```

### Aggregate Variables

Total across all properties:

```
{{property.property_count}}           # 2
{{property.total_value}}              # 2100000
{{property.total_change_percent}}     # 2.8
{{property.time_window}}              # "1 Month"
```

## Example Templates

### Simple Single Property

```
{center}HOME VALUE
{{property.formatted}}
Updated: {{datetime.date}}
```

### Multiple Properties

```
{center}PORTFOLIO
{{property.properties.0.formatted}}
{{property.properties.1.formatted}}
Total: ${{property.total_value}}
```

### Custom Layout with Details

```
{center}REAL ESTATE
HOME
 Value: {{property.properties.0.value_str}}
 Change: {{property.properties.0.change_str}}

RENTAL  
 Value: {{property.properties.1.value_str}}
 Change: {{property.properties.1.change_str}}
```

### Combined with Other Data

```
{center}INVESTMENTS
{center}STOCKS
{{stocks.stocks.0.formatted}}
{center}REAL ESTATE
{{property.properties.0.formatted}}
```

## How It Works

### Data Flow

1. **API Fetch** - Daily check fetches current value from Redfin
2. **Historical Storage** - Value saved to `/app/data/property_history.json`
3. **Comparison** - Current value compared to value from selected time window
4. **Display** - Formatted with color coding based on change direction

### Historical Data

Property tracking builds a history dataset over time:

```json
{
  "123 Main St, San Francisco, CA 94102": [
    {"timestamp": "2024-12-01T12:00:00Z", "value": 1200000},
    {"timestamp": "2025-01-01T12:00:00Z", "value": 1250000}
  ]
}
```

**Important Notes:**
- History starts from first check (no historical data imported)
- Data persists in Docker volume at `/app/data/`
- First comparison uses current value as baseline
- More accurate comparisons over time as history builds

### Value Estimation

Property values are **estimates**, not appraisals:

- **Redfin:** Uses their internal valuation algorithm
- **Accuracy:** Generally within 5-10% of actual value
- **Updates:** Values may change weekly/monthly
- **Not Financial Advice:** For informational purposes only

## Troubleshooting

### Property Not Found

**Problem:** "No exact match found for address"

**Solutions:**
1. Use full street address with city, state, and ZIP
2. Try the address exactly as shown on Redfin.com
3. Include unit number if applicable (e.g., "Unit 2A")
4. Verify property exists on Redfin website first

**Example Good Addresses:**
```
✅ 123 Main St, San Francisco, CA 94102
✅ 456 Oak Ave Unit 2A, Berkeley, CA 94704
✅ 789 Pine Street, Oakland, CA 94612

❌ 123 Main (too vague)
❌ Main St, SF (need full city name)
❌ 123 Main Street (missing city/state)
```

### No Value Available

**Problem:** Property found but no value returned

**Possible Causes:**
1. Property not listed/recently sold
2. Redfin doesn't have enough data
3. Property type not supported (land, commercial)

**Solutions:**
1. Check if property shows value estimate on Redfin.com
2. Wait a few days and try again
3. Use manual entry mode as fallback
4. Try alternative property if this one doesn't work

### Redfin API Not Available

**Problem:** "redfin package not installed"

**Solution:**
```bash
# Update requirements.txt (should already be there)
echo "redfin>=1.0.0" >> requirements.txt

# Rebuild Docker containers
/restart
```

### Values Not Updating

**Problem:** Same value shown every day

**Possible Causes:**
1. Property value genuinely hasn't changed (normal!)
2. Using cached value from history
3. Redfin API returning stale data

**Solutions:**
1. Check refresh interval setting
2. Property values don't change daily - this is normal
3. View history file at `/app/data/property_history.json`
4. Wait longer - values update weekly/monthly typically

### History File Issues

**Problem:** Can't access `/app/data/property_history.json`

**Solution:**
```bash
# Check Docker volume
docker-compose exec vestaboard-api ls -la /app/data/

# View history
docker-compose exec vestaboard-api cat /app/data/property_history.json

# Reset history (if corrupted)
docker-compose exec vestaboard-api rm /app/data/property_history.json
# Then restart service to create fresh history
```

## Privacy & Security

### Data Storage

- **Addresses:** Stored in config.json (local only)
- **Values:** Stored in property_history.json (local only)
- **No Cloud Sync:** All data stays on your machine/NAS
- **Docker Volume:** Data persists in named volume

### Best Practices

1. **Don't Share Config Files** - Contains your addresses
2. **Backup History** - Save `/app/data/property_history.json` periodically
3. **Use Display Names** - Short names like "HOME" instead of full addresses on board
4. **Respect Rate Limits** - Keep refresh at daily (don't spam Redfin)

## Advanced Usage

### Manual Entry Mode

For testing or when APIs fail:

```bash
PROPERTY_ENABLED=true
PROPERTY_API_PROVIDER=manual
```

With manual mode:
1. Values aren't auto-fetched
2. You manually update history file
3. Perfect for testing templates
4. Good fallback when APIs break

### Custom History Editing

Advanced users can manually edit history:

```bash
# Edit history file
docker-compose exec vestaboard-api vi /app/data/property_history.json

# Add historical entry
{
  "123 Main St, SF, CA": [
    {"timestamp": "2024-01-01T00:00:00Z", "value": 1000000},
    {"timestamp": "2024-12-01T00:00:00Z", "value": 1200000}
  ]
}
```

### Multiple Instances

Track different property sets in different Vesta instances:

1. Deploy separate Docker stacks
2. Each with own `/app/data` volume
3. Different property configurations
4. Useful for managing client portfolios

## Migration from Other Systems

### From Manual Tracking

If you've been tracking properties manually:

1. Enable property tracking in Vesta
2. Add your properties
3. Manually edit history file to import past values
4. Format: `{"timestamp": "ISO8601", "value": number}`

### From Other APIs

Switching from paid APIs to Redfin:

1. Export current values from old system
2. Configure Vesta with Redfin
3. Import values as initial history entries
4. Future updates use Redfin automatically

## API Provider Comparison

| Feature | Redfin (Unofficial) | Realty Mole (RapidAPI) | Manual Entry |
|---------|---------------------|------------------------|--------------|
| Cost | Free | $10-50/mo | Free |
| API Key | No | Yes | No |
| Reliability | Good | Excellent | Perfect |
| Coverage | US properties | US properties | Any |
| Setup Time | 5 min | 15 min | Instant |
| Automation | Full | Full | None |
| Best For | Personal use | Production | Testing |

## Support & Resources

### Documentation
- [API Options Guide](./PROPERTY_VALUE_API_OPTIONS.md) - Detailed API comparison
- [Redfin Python Library](https://github.com/reteps/redfin) - Library documentation
- [Template Variables](../../README.md#template-variables) - All available variables

### Getting Help
- Check logs: `docker-compose logs -f vestaboard-api`
- Validate addresses: Use `/property/search` API endpoint
- Test values: Use `/property/validate` API endpoint

### Contributing
Found a better API? Have improvements? Submit a PR!

---

**Happy Property Tracking! 🏠📈**

