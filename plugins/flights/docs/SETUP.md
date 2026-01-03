# Flight Tracking Setup Guide

Display nearby aircraft over your location with real-time flight data including call signs, altitude, ground speed, and squawk codes.

<!-- Screenshot: Add a flights-display.png to this plugin's docs/ directory -->

> ⚠️ **IMPORTANT**: The aviationstack free tier only allows **100 API requests per month**. This means you can only check for flights approximately 3 times per day (every 8 hours). For more frequent updates, you'll need to upgrade to a paid plan. See the [Rate Limiting](#rate-limiting) section below for details.

## Features

### Free Tier (No Position Data)
- **Random active flights**: Displays random flights from global active flights list
- **Basic flight information**: Call signs and squawk codes
- **Limited data**: No altitude, speed, or position information
- **100 requests/month**: Suitable for occasional display updates

### Paid Tier (Basic Plan $9.99/mo+)
- **Real-time flight tracking**: See aircraft currently flying over your location
- **Detailed flight information**: Call sign, altitude (feet), ground speed, and squawk code
- **Customizable search radius**: Configure how far to search for flights (default: 50km)
- **Distance filtering**: Only shows flights within your configured radius
- **Sorted by distance**: Closest flights appear first
- **10,000+ requests/month**: Suitable for real-time updates

## Prerequisites

1. **aviationstack API Key**: Sign up for a free account at [aviationstack.com](https://aviationstack.com/)
   - ⚠️ **Free tier includes only 100 API requests per month** (very limited)
   - ⚠️ **Free tier does NOT include real-time position data** - shows random active flights instead
   - Global flight data (call signs, squawk codes)
   - **Recommendation**: For true nearby flight tracking with real-time positions, altitude, and speed, upgrade to Basic plan ($9.99/mo for 10,000 requests)

2. **Location coordinates**: (Optional - not used with free tier)
   - Free tier shows random flights from global active flights list
   - Paid tiers use coordinates to filter nearby aircraft
   - You can use Google Maps to find your coordinates if you upgrade

## Configuration

### Step 1: Get Your aviationstack API Key

1. Go to [aviationstack.com](https://aviationstack.com/)
2. Sign up for a free account
3. Navigate to Dashboard → API Access Key
4. Copy your API access key

### Step 2: Configure Environment Variables

Add the following to your `.env` file (or use the Web UI settings):

```bash
# Flight Tracking Configuration
FLIGHTS_ENABLED=true
AVIATIONSTACK_API_KEY=your_aviationstack_api_key_here
FLIGHTS_LATITUDE=37.7749  # Your location latitude
FLIGHTS_LONGITUDE=-122.4194  # Your location longitude
FLIGHTS_RADIUS_KM=50  # Search radius in kilometers
FLIGHTS_MAX_COUNT=4  # Maximum flights to display (1-4)
FLIGHTS_REFRESH_SECONDS=28800  # Update interval (28800 = 8 hours, required for free tier!)
```

#### Configuration Options

- `FLIGHTS_ENABLED`: Enable/disable flight tracking (true/false)
- `AVIATIONSTACK_API_KEY`: Your aviationstack API key (required)
- `FLIGHTS_LATITUDE`: Latitude of your monitoring location (required)
- `FLIGHTS_LONGITUDE`: Longitude of your monitoring location (required)
- `FLIGHTS_RADIUS_KM`: Search radius in kilometers (default: 50km)
- `FLIGHTS_MAX_COUNT`: Maximum number of flights to display (default: 4)
- `FLIGHTS_REFRESH_SECONDS`: How often to update flight data (default: 28800 seconds = 8 hours, required for free tier)

### Step 3: Find Your Coordinates

**Using Google Maps:**
1. Go to [Google Maps](https://maps.google.com/)
2. Right-click on your location
3. Select the coordinates (e.g., "37.7749, -122.4194")
4. Use these values for `FLIGHTS_LATITUDE` and `FLIGHTS_LONGITUDE`

**Common locations:**
- San Francisco, CA: `37.7749, -122.4194`
- New York, NY: `40.7128, -74.0060`
- Los Angeles, CA: `34.0522, -118.2437`
- Chicago, IL: `41.8781, -87.6298`

### Step 4: Adjust Search Radius

The search radius determines how far from your location to look for flights:

- **Small radius (10-20km)**: Only very close flights, good for urban areas
- **Medium radius (30-50km)**: Balanced coverage, default setting
- **Large radius (50-100km)**: Wide area coverage, more flights but less relevant

### Step 5: Apply Configuration

If using Docker (recommended):
```bash
# Restart containers to apply changes
docker-compose -f docker-compose.dev.yml restart
```

Or use the Cursor commands:
```
/restart
```

## Template Variables

Use these variables in your custom templates to display flight data:

### Single Flight (first/closest flight)
- `{{flights.call_sign}}` - Aircraft call sign (e.g., "UAL123")
- `{{flights.altitude}}` - Altitude in feet (e.g., "35000")
- `{{flights.ground_speed}}` - Ground speed in km/h (e.g., "450")
- `{{flights.squawk}}` - Squawk/transponder code (e.g., "1200")
- `{{flights.distance_km}}` - Distance from your location in km (e.g., "12.5")
- `{{flights.formatted}}` - Pre-formatted flight line

### Multiple Flights
- `{{flights.flight_count}}` - Number of flights detected
- `{{flights.flights.0.call_sign}}` - First flight's call sign
- `{{flights.flights.0.altitude}}` - First flight's altitude
- `{{flights.flights.0.formatted}}` - First flight formatted line
- `{{flights.flights.1.call_sign}}` - Second flight's call sign
- `{{flights.flights.2.call_sign}}` - Third flight's call sign
- `{{flights.flights.3.call_sign}}` - Fourth flight's call sign

## Example Template

Create a custom page template to display nearby aircraft:

```
{center}{{yellow}} NEARBY AIRCRAFT {{yellow}}
CALL   ALT    GS  SQWK
{{flights.flights.0.formatted}}
{{flights.flights.1.formatted}}
{{flights.flights.2.formatted}}
{{flights.flights.3.formatted}}
```

This will display:
- Header with "NEARBY AIRCRAFT" centered with yellow indicators
- Column headers: Call sign, Altitude, Ground Speed, Squawk
- Up to 4 flights with their information

## Troubleshooting

### No Flights Appearing

**Issue**: "No aircraft nearby" message

**Solutions**:
1. **Increase search radius**: Try `FLIGHTS_RADIUS_KM=100` for wider coverage
2. **Check API key**: Verify your aviationstack API key is correct
3. **Verify coordinates**: Ensure latitude/longitude are correct
4. **Check API limits**: Free tier has 500 requests/month
5. **Flight timing**: Try at different times of day (more flights during daytime)

### API Rate Limit Exceeded

**Issue**: "Rate limit exceeded" error

**Solutions**:
1. **Reduce refresh rate significantly**: The free tier only allows 100 requests/month
   - Set `FLIGHTS_REFRESH_SECONDS=28800` (8 hours) for 90 requests/month
   - Set `FLIGHTS_REFRESH_SECONDS=43200` (12 hours) for 60 requests/month
   - Set `FLIGHTS_REFRESH_SECONDS=86400` (24 hours) for 30 requests/month
2. **Upgrade plan**: Consider upgrading to aviationstack Basic ($9.99/mo for 10,000 requests)
3. **Monitor usage**: Check your API usage in the aviationstack dashboard
4. **Disable when not needed**: Set `FLIGHTS_ENABLED=false` when you're not actively using it

### Incorrect Flight Data

**Issue**: Flights appear in wrong location or incorrect data

**Solutions**:
1. **Verify coordinates**: Double-check your `FLIGHTS_LATITUDE` and `FLIGHTS_LONGITUDE`
2. **API delay**: Flight positions may be delayed by 1-2 minutes
3. **Wait for update**: Give the system a few minutes to fetch fresh data

### Connection Errors

**Issue**: "Failed to fetch flight data" errors

**Solutions**:
1. **Check internet connection**: Ensure your system has internet access
2. **Verify API endpoint**: aviationstack API should be accessible
3. **Check Docker networking**: If using Docker, ensure containers can access external APIs
4. **Review logs**: Check application logs for detailed error messages

## API Information

### aviationstack Features

- **Real-time flight data**: Live positions updated continuously
- **Global coverage**: Flights worldwide
- **Comprehensive data**: Altitude, speed, heading, squawk codes
- **Historical data**: Access to past flight information (paid plans)

### Free Tier Limits

- **100 API requests per month** (very limited!)
- Real-time flight status
- Global coverage
- No credit card required

### Rate Limiting

⚠️ **Important**: The free tier only allows 100 requests per month, which is very restrictive.

To stay within the free tier (100 requests/month):
- **Every 8 hours** (3 per day) = 90 requests/month ✅ (recommended)
- **Every 12 hours** (2 per day) = 60 requests/month ✅ (safe)
- **Once per day** (1 per day) = 30 requests/month ✅ (very safe)

**Unsustainable refresh rates:**
- Every 1 minute = ~43,200 requests/month ❌
- Every 5 minutes = ~8,640 requests/month ❌
- Every 1 hour = ~720 requests/month ❌

**Recommended configuration:**
```bash
FLIGHTS_REFRESH_SECONDS=28800  # 8 hours
```

Or for more frequent updates, consider upgrading to a paid aviationstack plan:
- **Basic Plan**: 10,000 requests/month ($9.99/mo) - allows 1-minute refresh
- **Professional Plan**: 100,000 requests/month ($49.99/mo)

## Security Notes

- Store your API key in environment variables or `.env` file
- Never commit your `.env` file to version control
- Use `.gitignore` to exclude `.env` files
- Rotate API keys if they become compromised

## Additional Resources

- [aviationstack API Documentation](https://aviationstack.com/documentation)
- [aviationstack Dashboard](https://aviationstack.com/dashboard)
- [Vestaboard Template Guide](../reference/TEMPLATES.md) (if available)

## Support

If you encounter issues:

1. Check the application logs:
   ```bash
   docker-compose logs -f api
   ```

2. Verify your configuration:
   ```bash
   # Check if flights are enabled
   docker-compose exec api python -c "from src.config import Config; print(f'Flights enabled: {Config.FLIGHTS_ENABLED}')"
   ```

3. Test the API directly:
   ```bash
   curl "https://api.aviationstack.com/v1/flights?access_key=YOUR_KEY&limit=10"
   ```

4. Open an issue on the project repository with:
   - Error messages from logs
   - Your configuration (without API keys)
   - Steps to reproduce the issue

