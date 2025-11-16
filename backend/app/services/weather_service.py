"""
Weather Service for ChatBot
Integrates WeatherAPI.com for weather-related queries
"""

import os
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class WeatherAPIError(Exception):
    """Custom exception for Weather API errors"""
    def __init__(self, message: str, code: Optional[int] = None):
        self.message = message
        self.code = code
        super().__init__(self.message)


class WeatherService:
    """
    Weather service for fetching and formatting weather data
    Integrates with WeatherAPI.com
    """
    
    BASE_URL = "https://api.weatherapi.com/v1"
    
    # Error code mappings from WeatherAPI
    ERROR_CODES = {
        1002: "API key not provided",
        1003: "Location not provided",
        1005: "API request URL is invalid",
        1006: "No location found matching your query",
        2006: "API key is invalid",
        2007: "API key has exceeded quota",
        2008: "API key has been disabled",
        2009: "API key does not have access to this resource",
    }
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Weather Service"""
        self.api_key = api_key or os.getenv("WEATHER_API_KEY")
        if not self.api_key:
            logger.warning("⚠️ Weather API key not configured - weather features will be unavailable")
        else:
            logger.info(f"✅ Weather API initialized with key: {self.api_key[:10]}...")
        
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict:
        """Make HTTP request to Weather API"""
        if not self.api_key:
            raise WeatherAPIError("Weather API key not configured")
        
        url = f"{self.BASE_URL}/{endpoint}.json"
        params['key'] = self.api_key
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                error_data = response.json().get('error', {})
                code = error_data.get('code')
                message = self.ERROR_CODES.get(code, error_data.get('message', 'Unknown error'))
                raise WeatherAPIError(message, code=code)
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Weather API request failed: {e}")
            raise WeatherAPIError(f"Failed to fetch weather data: {str(e)}")
    
    def get_current_weather(self, location: str, aqi: bool = True) -> Dict:
        """
        Get current weather for a location
        
        Args:
            location: City name, lat/lon, zip code, or IP address
            aqi: Include air quality data
            
        Returns:
            Formatted weather data
        """
        try:
            params = {'q': location, 'aqi': 'yes' if aqi else 'no'}
            data = self._make_request('current', params)
            
            return self._format_current_weather(data)
        
        except WeatherAPIError as e:
            logger.error(f"Error fetching current weather: {e.message}")
            return {"error": e.message}
    
    def get_forecast(self, location: str, days: int = 3, alerts: bool = True) -> Dict:
        """
        Get weather forecast
        
        Args:
            location: Location query
            days: Number of days (1-14)
            alerts: Include weather alerts
            
        Returns:
            Formatted forecast data
        """
        try:
            days = min(max(days, 1), 14)  # Clamp between 1-14
            params = {
                'q': location,
                'days': days,
                'aqi': 'yes',
                'alerts': 'yes' if alerts else 'no'
            }
            data = self._make_request('forecast', params)
            
            return self._format_forecast(data)
        
        except WeatherAPIError as e:
            logger.error(f"Error fetching forecast: {e.message}")
            return {"error": e.message}
    
    def search_location(self, query: str) -> List[Dict]:
        """
        Search for locations (autocomplete)
        
        Args:
            query: Search query (minimum 3 characters)
            
        Returns:
            List of matching locations
        """
        try:
            if len(query) < 3:
                return []
            
            params = {'q': query}
            data = self._make_request('search', params)
            
            return [{
                'name': loc['name'],
                'region': loc['region'],
                'country': loc['country'],
                'lat': loc['lat'],
                'lon': loc['lon']
            } for loc in data[:5]]  # Return top 5 results
        
        except WeatherAPIError as e:
            logger.error(f"Error searching locations: {e.message}")
            return []
    
    def get_astronomy(self, location: str, date: Optional[str] = None) -> Dict:
        """
        Get astronomy data (sunrise, sunset, moon phase)
        
        Args:
            location: Location query
            date: Date in YYYY-MM-DD format (default: today)
            
        Returns:
            Astronomy data
        """
        try:
            params = {
                'q': location,
                'dt': date or datetime.now().strftime('%Y-%m-%d')
            }
            data = self._make_request('astronomy', params)
            
            return self._format_astronomy(data)
        
        except WeatherAPIError as e:
            logger.error(f"Error fetching astronomy data: {e.message}")
            return {"error": e.message}
    
    def _format_current_weather(self, data: Dict) -> Dict:
        """Format current weather data for response"""
        location = data['location']
        current = data['current']
        
        result = {
            'type': 'current_weather',
            'location': {
                'name': location['name'],
                'region': location['region'],
                'country': location['country'],
                'lat': location['lat'],
                'lon': location['lon'],
                'timezone': location['tz_id'],
                'localtime': location['localtime']
            },
            'current': {
                'temp_c': current['temp_c'],
                'temp_f': current['temp_f'],
                'condition': current['condition']['text'],
                'condition_icon': current['condition']['icon'],
                'wind_kph': current['wind_kph'],
                'wind_mph': current['wind_mph'],
                'wind_dir': current['wind_dir'],
                'pressure_mb': current['pressure_mb'],
                'precip_mm': current['precip_mm'],
                'humidity': current['humidity'],
                'cloud': current['cloud'],
                'feels_like_c': current['feelslike_c'],
                'feels_like_f': current['feelslike_f'],
                'vis_km': current['vis_km'],
                'uv': current['uv'],
                'gust_kph': current['gust_kph']
            }
        }
        
        # Add air quality if available
        if 'air_quality' in current:
            result['air_quality'] = {
                'co': current['air_quality'].get('co'),
                'no2': current['air_quality'].get('no2'),
                'o3': current['air_quality'].get('o3'),
                'pm2_5': current['air_quality'].get('pm2_5'),
                'pm10': current['air_quality'].get('pm10'),
                'us_epa_index': current['air_quality'].get('us-epa-index'),
                'gb_defra_index': current['air_quality'].get('gb-defra-index')
            }
        
        return result
    
    def _format_forecast(self, data: Dict) -> Dict:
        """Format forecast data for response"""
        location = data['location']
        current = data['current']
        forecast_days = data['forecast']['forecastday']
        
        result = {
            'type': 'forecast',
            'location': {
                'name': location['name'],
                'region': location['region'],
                'country': location['country'],
                'timezone': location['tz_id']
            },
            'current': {
                'temp_c': current['temp_c'],
                'temp_f': current['temp_f'],
                'condition': current['condition']['text'],
                'condition_icon': current['condition']['icon']
            },
            'forecast': []
        }
        
        for day in forecast_days:
            day_data = {
                'date': day['date'],
                'date_epoch': day['date_epoch'],
                'day': {
                    'maxtemp_c': day['day']['maxtemp_c'],
                    'maxtemp_f': day['day']['maxtemp_f'],
                    'mintemp_c': day['day']['mintemp_c'],
                    'mintemp_f': day['day']['mintemp_f'],
                    'avgtemp_c': day['day']['avgtemp_c'],
                    'avgtemp_f': day['day']['avgtemp_f'],
                    'condition': day['day']['condition']['text'],
                    'condition_icon': day['day']['condition']['icon'],
                    'maxwind_kph': day['day']['maxwind_kph'],
                    'totalprecip_mm': day['day']['totalprecip_mm'],
                    'avghumidity': day['day']['avghumidity'],
                    'daily_chance_of_rain': day['day']['daily_chance_of_rain'],
                    'daily_chance_of_snow': day['day']['daily_chance_of_snow'],
                    'uv': day['day']['uv']
                },
                'astro': {
                    'sunrise': day['astro']['sunrise'],
                    'sunset': day['astro']['sunset'],
                    'moonrise': day['astro']['moonrise'],
                    'moonset': day['astro']['moonset'],
                    'moon_phase': day['astro']['moon_phase'],
                    'moon_illumination': day['astro']['moon_illumination']
                }
            }
            result['forecast'].append(day_data)
        
        # Add alerts if available
        if 'alerts' in data and data['alerts']['alert']:
            result['alerts'] = [{
                'headline': alert['headline'],
                'severity': alert['severity'],
                'urgency': alert['urgency'],
                'event': alert['event'],
                'effective': alert['effective'],
                'expires': alert['expires'],
                'desc': alert['desc']
            } for alert in data['alerts']['alert']]
        
        return result
    
    def _format_astronomy(self, data: Dict) -> Dict:
        """Format astronomy data for response"""
        location = data['location']
        astro = data['astronomy']['astro']
        
        return {
            'type': 'astronomy',
            'location': {
                'name': location['name'],
                'region': location['region'],
                'country': location['country']
            },
            'astronomy': {
                'sunrise': astro['sunrise'],
                'sunset': astro['sunset'],
                'moonrise': astro['moonrise'],
                'moonset': astro['moonset'],
                'moon_phase': astro['moon_phase'],
                'moon_illumination': astro['moon_illumination'],
                'is_moon_up': astro['is_moon_up'],
                'is_sun_up': astro['is_sun_up']
            }
        }
    
    def format_for_llm(self, weather_data: Dict) -> str:
        """
        Format weather data as a text prompt for the LLM
        
        Args:
            weather_data: Weather data from API
            
        Returns:
            Formatted text for LLM context
        """
        if 'error' in weather_data:
            return f"⚠️ Weather data unavailable: {weather_data['error']}"
        
        weather_type = weather_data.get('type', 'unknown')
        
        if weather_type == 'current_weather':
            return self._format_current_for_llm(weather_data)
        elif weather_type == 'forecast':
            return self._format_forecast_for_llm(weather_data)
        elif weather_type == 'astronomy':
            return self._format_astronomy_for_llm(weather_data)
        
        return "Weather data format not recognized."
    
    def _format_current_for_llm(self, data: Dict) -> str:
        """Format current weather for LLM"""
        loc = data['location']
        curr = data['current']
        
        text = f"""🌍 Current Weather in {loc['name']}, {loc['region']}, {loc['country']}
📍 Location: {loc['lat']}, {loc['lon']} | 🕐 Local Time: {loc['localtime']}

🌡️ **Temperature:** {curr['temp_c']}°C ({curr['temp_f']}°F)
🤚 **Feels Like:** {curr['feels_like_c']}°C ({curr['feels_like_f']}°F)
☁️ **Condition:** {curr['condition']}
💧 **Humidity:** {curr['humidity']}%
🌬️ **Wind:** {curr['wind_kph']} km/h ({curr['wind_mph']} mph) from {curr['wind_dir']}
💨 **Wind Gust:** {curr['gust_kph']} km/h
🌡️ **Pressure:** {curr['pressure_mb']} mb
🌧️ **Precipitation:** {curr['precip_mm']} mm
👁️ **Visibility:** {curr['vis_km']} km
☁️ **Cloud Cover:** {curr['cloud']}%
☀️ **UV Index:** {curr['uv']} ({self._get_uv_level(curr['uv'])})"""
        
        # Add air quality if available
        if 'air_quality' in data:
            aqi = data['air_quality']
            text += f"\n\n🏭 **Air Quality:**"
            text += f"\n- US EPA Index: {aqi['us_epa_index']} ({self._get_aqi_level(aqi['us_epa_index'])})"
            text += f"\n- PM2.5: {aqi['pm2_5']:.1f} μg/m³"
            text += f"\n- PM10: {aqi['pm10']:.1f} μg/m³"
        
        return text
    
    def _format_forecast_for_llm(self, data: Dict) -> str:
        """Format forecast for LLM"""
        loc = data['location']
        forecast = data['forecast']
        
        text = f"""🌍 Weather Forecast for {loc['name']}, {loc['region']}, {loc['country']}\n"""
        
        for day in forecast:
            day_info = day['day']
            astro = day['astro']
            
            text += f"\n📅 **{day['date']}**"
            text += f"\n🌡️ Temperature: {day_info['mintemp_c']}°C - {day_info['maxtemp_c']}°C ({day_info['mintemp_f']}°F - {day_info['maxtemp_f']}°F)"
            text += f"\n☁️ Condition: {day_info['condition']}"
            text += f"\n🌧️ Chance of Rain: {day_info['daily_chance_of_rain']}%"
            text += f"\n❄️ Chance of Snow: {day_info['daily_chance_of_snow']}%"
            text += f"\n💧 Humidity: {day_info['avghumidity']}%"
            text += f"\n🌬️ Max Wind: {day_info['maxwind_kph']} km/h"
            text += f"\n🌅 Sunrise: {astro['sunrise']} | 🌇 Sunset: {astro['sunset']}"
            text += f"\n🌙 Moon: {astro['moon_phase']} ({astro['moon_illumination']}% illumination)\n"
        
        # Add alerts if available
        if 'alerts' in data and data['alerts']:
            text += f"\n⚠️ **WEATHER ALERTS:**\n"
            for alert in data['alerts']:
                text += f"\n🚨 {alert['headline']}"
                text += f"\nSeverity: {alert['severity']} | Event: {alert['event']}"
                text += f"\nExpires: {alert['expires']}\n"
        
        return text
    
    def _format_astronomy_for_llm(self, data: Dict) -> str:
        """Format astronomy data for LLM"""
        loc = data['location']
        astro = data['astronomy']
        
        text = f"""🌍 Astronomy Data for {loc['name']}, {loc['region']}, {loc['country']}

☀️ **Sun:**
- Sunrise: {astro['sunrise']}
- Sunset: {astro['sunset']}
- Sun is {"up" if astro['is_sun_up'] else "down"}

🌙 **Moon:**
- Moonrise: {astro['moonrise']}
- Moonset: {astro['moonset']}
- Phase: {astro['moon_phase']}
- Illumination: {astro['moon_illumination']}%
- Moon is {"up" if astro['is_moon_up'] else "down"}"""
        
        return text
    
    @staticmethod
    def _get_uv_level(uv_index: float) -> str:
        """Get UV risk level"""
        if uv_index <= 2:
            return "Low"
        elif uv_index <= 5:
            return "Moderate"
        elif uv_index <= 7:
            return "High"
        elif uv_index <= 10:
            return "Very High"
        else:
            return "Extreme"
    
    @staticmethod
    def _get_aqi_level(index: int) -> str:
        """Get air quality level"""
        levels = {
            1: "Good",
            2: "Moderate",
            3: "Unhealthy for Sensitive Groups",
            4: "Unhealthy",
            5: "Very Unhealthy",
            6: "Hazardous"
        }
        return levels.get(index, "Unknown")


# Singleton instance
_weather_service = None

def get_weather_service() -> WeatherService:
    """Get or create weather service singleton"""
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
