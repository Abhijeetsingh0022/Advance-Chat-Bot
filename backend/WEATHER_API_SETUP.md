# Weather API Integration Setup

## Overview
The ChatBot now includes comprehensive weather capabilities powered by WeatherAPI.com. Users can ask about current weather, forecasts, astronomy data, and more.

## Features

### Available Weather Functions:
1. **get_current_weather** - Real-time weather with temperature, conditions, wind, humidity, air quality, UV index
2. **get_weather_forecast** - Up to 14-day forecasts with daily conditions, precipitation, sunrise/sunset, moon phases
3. **get_astronomy_data** - Sunrise, sunset, moonrise, moonset, moon phase and illumination
4. **search_locations** - Find and autocomplete location names

### Data Provided:
- **Current Weather**: Temperature (°C/°F), feels like, conditions, humidity, wind speed/direction, pressure, precipitation, visibility, cloud cover, UV index, air quality (PM2.5, PM10, AQI)
- **Forecast**: Min/max temps, conditions, rain/snow chances, humidity, wind, UV index, sunrise/sunset, moon phase
- **Astronomy**: Sunrise/sunset times, moonrise/moonset, moon phase, illumination percentage
- **Location Search**: City names, regions, countries, coordinates

## Setup Instructions

### 1. Get Your API Key

1. Visit [WeatherAPI.com](https://www.weatherapi.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

**Free Tier Includes:**
- 1,000,000 API calls per month
- Current weather
- 3-day forecast
- Historical weather (7 days)
- Search/Autocomplete
- Astronomy data
- Time zone info
- Sports data

### 2. Add API Key to Environment

Add this line to your `.env` file in the backend directory:

```bash
# Weather API (WeatherAPI.com)
WEATHER_API_KEY=your_api_key_here
```

### 3. Restart Backend Server

```bash
cd backend
python run.py
```

## Usage Examples

### Example User Queries:

**Current Weather:**
- "What's the weather in London?"
- "Tell me the current weather in New York"
- "How's the weather in Tokyo right now?"
- "What's the temperature in Paris?"

**Forecast:**
- "What's the weather forecast for this week in London?"
- "Will it rain in Seattle tomorrow?"
- "Give me the 7-day forecast for Miami"
- "What's the weather going to be like next week in Sydney?"

**Astronomy:**
- "When is sunrise in Mumbai?"
- "What time is sunset today in Los Angeles?"
- "What's the moon phase tonight?"
- "When does the moon rise in Cairo?"

**Location Search:**
- "Find weather stations in California"
- "Search for cities named Paris"

### Function Call Examples:

The AI will automatically call these functions when appropriate:

```python
# Current Weather
{
  "function": "get_current_weather",
  "arguments": {
    "location": "London",
    "aqi": true
  }
}

# 7-Day Forecast
{
  "function": "get_weather_forecast",
  "arguments": {
    "location": "New York",
    "days": 7
  }
}

# Astronomy Data
{
  "function": "get_astronomy_data",
  "arguments": {
    "location": "Tokyo",
    "date": "2025-11-16"
  }
}

# Location Search
{
  "function": "search_locations",
  "arguments": {
    "query": "Paris"
  }
}
```

## Response Format

### Current Weather Response:
```json
{
  "success": true,
  "location": "London, England, United Kingdom",
  "coordinates": "51.52, -0.11",
  "local_time": "2025-11-16 10:30",
  "temperature_c": 12,
  "temperature_f": 53.6,
  "feels_like_c": 10,
  "feels_like_f": 50,
  "condition": "Partly cloudy",
  "humidity": "76%",
  "wind": "15.0 km/h (9.3 mph) from WSW",
  "pressure": "1013 mb",
  "uv_index": 3,
  "air_quality": {
    "us_epa_index": 1,
    "pm2_5": 8.5,
    "pm10": 12.3
  },
  "description": "🌍 Current Weather in London, England, United Kingdom\n..."
}
```

### Forecast Response:
```json
{
  "success": true,
  "location": "London, England, United Kingdom",
  "days": 3,
  "forecast": [
    {
      "date": "2025-11-16",
      "max_temp_c": 14,
      "min_temp_c": 8,
      "condition": "Partly cloudy",
      "chance_of_rain": "20%",
      "sunrise": "07:15 AM",
      "sunset": "04:30 PM",
      "moon_phase": "Waxing Crescent"
    }
  ],
  "description": "🌍 Weather Forecast for London...\n..."
}
```

## Troubleshooting

### Common Issues:

**1. "Weather API key not configured"**
- Solution: Add `WEATHER_API_KEY` to your `.env` file
- Restart the backend server

**2. "No location found matching your query"**
- Solution: Try different location formats:
  - City name: "London"
  - City, Country: "London, UK"
  - Coordinates: "51.5074,-0.1278"
  - Zip code: "10001"
  - IP address: "auto:ip"

**3. "API key has exceeded quota"**
- Solution: Free tier has 1M calls/month
- Upgrade at [WeatherAPI.com/pricing](https://www.weatherapi.com/pricing.aspx)
- Or wait for next month's reset

**4. "API key is invalid"**
- Solution: Check your API key in the dashboard
- Make sure there are no extra spaces
- Regenerate key if needed

## Advanced Features

### Pro/Business Tier Features:
- Historical weather (from 2010)
- Future weather (14-300 days ahead)
- Marine weather with tides
- 15-minute interval data
- Pollen data
- Solar irradiance
- Wind data at 100m
- Bulk requests (up to 50 locations)

To enable, upgrade your account at WeatherAPI.com

## API Limits

### Free Tier:
- 1,000,000 calls/month
- 3-day forecast
- Current weather
- Search/Autocomplete

### Pro Tier ($4/month):
- 5,000,000 calls/month
- 14-day forecast
- Historical weather
- Future weather

### Business Tier ($40/month):
- 25,000,000 calls/month
- Marine weather
- Bulk requests
- Priority support

## Support

- WeatherAPI Documentation: https://www.weatherapi.com/docs/
- ChatBot Issues: Open an issue on GitHub
- WeatherAPI Support: support@weatherapi.com

## License

This integration uses WeatherAPI.com. By using this feature, you agree to their [Terms of Service](https://www.weatherapi.com/terms.aspx).
