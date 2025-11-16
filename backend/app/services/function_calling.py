"""Function calling tools for AI agents."""
import json
import aiohttp
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import re
from app.core.config import settings
from app.services.weather_service import get_weather_service

logger = logging.getLogger(__name__)


# Tool definitions in OpenAI function format
AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Perform mathematical calculations. Supports basic arithmetic (+, -, *, /), exponents (**), and functions like sqrt, sin, cos, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate, e.g., '2 + 2', 'sqrt(16)', '10 ** 2'"
                    }
                },
                "required": ["expression"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get current/realtime weather information for any location worldwide. Includes temperature, conditions, wind, humidity, air quality, UV index, and more.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, coordinates (lat,lon), zip code, IP address, or airport code. Examples: 'London', '40.7128,-74.0060', '10001', 'LHR'"
                    },
                    "aqi": {
                        "type": "boolean",
                        "description": "Include air quality data (default: true)",
                        "default": True
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather_forecast",
            "description": "Get weather forecast for up to 14 days. Includes daily forecasts with temperatures, conditions, precipitation chances, sunrise/sunset, moon phases, and weather alerts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, coordinates, zip code, or other location identifier"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of forecast days (1-14)",
                        "minimum": 1,
                        "maximum": 14,
                        "default": 3
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_astronomy_data",
            "description": "Get astronomy information including sunrise, sunset, moonrise, moonset, moon phase, and moon illumination for a specific location and date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or location identifier"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (optional, defaults to today)"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_locations",
            "description": "Search and find location information for weather queries. Returns matching cities/places with their coordinates and country info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Location search query (minimum 3 characters)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for current information, news, or facts",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (default: 3)",
                        "minimum": 1,
                        "maximum": 10
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Get the current date and time in a specific timezone",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone identifier, e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo' (default: UTC)"
                    }
                },
                "required": []
            }
        }
    }
]


class FunctionCallingService:
    """Service for executing AI function calls."""
    
    def __init__(self, weather_api_key: Optional[str] = None):
        self.weather_service = get_weather_service()
        self.tools = {tool["function"]["name"]: tool for tool in AVAILABLE_TOOLS}
    
    def get_tools_definitions(self) -> List[Dict]:
        """Get all available tool definitions."""
        return AVAILABLE_TOOLS
    
    async def execute_function(self, function_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a function call and return results."""
        try:
            logger.info(f"Executing function: {function_name} with args: {arguments}")
            
            if function_name == "calculator":
                return await self._calculator(arguments.get("expression", ""))
            elif function_name == "get_current_weather":
                return await self._get_current_weather(
                    arguments.get("location", ""),
                    arguments.get("aqi", True)
                )
            elif function_name == "get_weather_forecast":
                return await self._get_weather_forecast(
                    arguments.get("location", ""),
                    arguments.get("days", 3)
                )
            elif function_name == "get_astronomy_data":
                return await self._get_astronomy_data(
                    arguments.get("location", ""),
                    arguments.get("date")
                )
            elif function_name == "search_locations":
                return await self._search_locations(arguments.get("query", ""))
            elif function_name == "search_web":
                return await self._search_web(
                    arguments.get("query", ""),
                    arguments.get("num_results", 3)
                )
            elif function_name == "get_current_time":
                return await self._get_current_time(arguments.get("timezone", "UTC"))
            else:
                return {
                    "error": f"Unknown function: {function_name}",
                    "success": False
                }
        
        except Exception as e:
            logger.error(f"Error executing function {function_name}: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    async def _calculator(self, expression: str) -> Dict[str, Any]:
        """Safe mathematical calculator."""
        try:
            # Sanitize expression - only allow safe math operations
            safe_expr = expression.strip()
            
            # Check for dangerous patterns
            if any(word in safe_expr.lower() for word in ['import', 'exec', 'eval', '__', 'open', 'file']):
                return {
                    "error": "Invalid expression - potentially dangerous operation",
                    "success": False
                }
            
            # Define safe functions
            import math
            safe_functions = {
                'abs': abs,
                'round': round,
                'min': min,
                'max': max,
                'sum': sum,
                'pow': pow,
                'sqrt': math.sqrt,
                'sin': math.sin,
                'cos': math.cos,
                'tan': math.tan,
                'pi': math.pi,
                'e': math.e,
                'log': math.log,
                'log10': math.log10,
                'exp': math.exp,
                'floor': math.floor,
                'ceil': math.ceil,
            }
            
            # Evaluate safely
            result = eval(safe_expr, {"__builtins__": {}}, safe_functions)
            
            return {
                "result": result,
                "expression": expression,
                "success": True
            }
        
        except Exception as e:
            return {
                "error": f"Calculation error: {str(e)}",
                "expression": expression,
                "success": False
            }
    
    async def _get_current_weather(self, location: str, aqi: bool = True) -> Dict[str, Any]:
        """Get current weather using WeatherAPI.com"""
        try:
            weather_data = self.weather_service.get_current_weather(location, aqi=aqi)
            
            if 'error' in weather_data:
                return {
                    "error": weather_data['error'],
                    "success": False
                }
            
            # Format for function calling response
            loc = weather_data['location']
            curr = weather_data['current']
            
            result = {
                "success": True,
                "location": f"{loc['name']}, {loc['region']}, {loc['country']}",
                "coordinates": f"{loc['lat']}, {loc['lon']}",
                "local_time": loc['localtime'],
                "temperature_c": curr['temp_c'],
                "temperature_f": curr['temp_f'],
                "feels_like_c": curr['feels_like_c'],
                "feels_like_f": curr['feels_like_f'],
                "condition": curr['condition'],
                "humidity": f"{curr['humidity']}%",
                "wind": f"{curr['wind_kph']} km/h ({curr['wind_mph']} mph) from {curr['wind_dir']}",
                "pressure": f"{curr['pressure_mb']} mb",
                "precipitation": f"{curr['precip_mm']} mm",
                "visibility": f"{curr['vis_km']} km",
                "cloud_cover": f"{curr['cloud']}%",
                "uv_index": curr['uv']
            }
            
            # Add air quality if requested
            if aqi and 'air_quality' in weather_data:
                aq = weather_data['air_quality']
                result["air_quality"] = {
                    "us_epa_index": aq['us_epa_index'],
                    "pm2_5": aq['pm2_5'],
                    "pm10": aq['pm10']
                }
            
            # Add formatted description for LLM
            result["description"] = self.weather_service.format_for_llm(weather_data)
            
            return result
        
        except Exception as e:
            logger.error(f"Weather error: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    async def _get_weather_forecast(self, location: str, days: int = 3) -> Dict[str, Any]:
        """Get weather forecast using WeatherAPI.com"""
        try:
            forecast_data = self.weather_service.get_forecast(location, days=days)
            
            if 'error' in forecast_data:
                return {
                    "error": forecast_data['error'],
                    "success": False
                }
            
            # Format for function calling response
            loc = forecast_data['location']
            forecast = forecast_data['forecast']
            
            result = {
                "success": True,
                "location": f"{loc['name']}, {loc['region']}, {loc['country']}",
                "days": days,
                "forecast": []
            }
            
            for day in forecast:
                day_data = day['day']
                astro = day['astro']
                
                result["forecast"].append({
                    "date": day['date'],
                    "max_temp_c": day_data['maxtemp_c'],
                    "min_temp_c": day_data['mintemp_c'],
                    "max_temp_f": day_data['maxtemp_f'],
                    "min_temp_f": day_data['mintemp_f'],
                    "condition": day_data['condition'],
                    "chance_of_rain": f"{day_data['daily_chance_of_rain']}%",
                    "chance_of_snow": f"{day_data['daily_chance_of_snow']}%",
                    "humidity": f"{day_data['avghumidity']}%",
                    "max_wind_kph": day_data['maxwind_kph'],
                    "uv_index": day_data['uv'],
                    "sunrise": astro['sunrise'],
                    "sunset": astro['sunset'],
                    "moon_phase": astro['moon_phase']
                })
            
            # Add alerts if present
            if 'alerts' in forecast_data:
                result["alerts"] = forecast_data['alerts']
            
            # Add formatted description for LLM
            result["description"] = self.weather_service.format_for_llm(forecast_data)
            
            return result
        
        except Exception as e:
            logger.error(f"Forecast error: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    async def _get_astronomy_data(self, location: str, date: Optional[str] = None) -> Dict[str, Any]:
        """Get astronomy data using WeatherAPI.com"""
        try:
            astro_data = self.weather_service.get_astronomy(location, date=date)
            
            if 'error' in astro_data:
                return {
                    "error": astro_data['error'],
                    "success": False
                }
            
            # Format for function calling response
            loc = astro_data['location']
            astro = astro_data['astronomy']
            
            result = {
                "success": True,
                "location": f"{loc['name']}, {loc['region']}, {loc['country']}",
                "date": date or datetime.now().strftime('%Y-%m-%d'),
                "sunrise": astro['sunrise'],
                "sunset": astro['sunset'],
                "moonrise": astro['moonrise'],
                "moonset": astro['moonset'],
                "moon_phase": astro['moon_phase'],
                "moon_illumination": f"{astro['moon_illumination']}%",
                "is_sun_up": astro['is_sun_up'],
                "is_moon_up": astro['is_moon_up'],
                "description": self.weather_service.format_for_llm(astro_data)
            }
            
            return result
        
        except Exception as e:
            logger.error(f"Astronomy error: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    async def _search_locations(self, query: str) -> Dict[str, Any]:
        """Search for locations using WeatherAPI.com"""
        try:
            locations = self.weather_service.search_location(query)
            
            if not locations:
                return {
                    "error": "No locations found matching your query",
                    "success": False
                }
            
            return {
                "success": True,
                "query": query,
                "results": locations,
                "count": len(locations)
            }
        
        except Exception as e:
            logger.error(f"Location search error: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    async def _get_weather(self, location: str, units: str = "celsius") -> Dict[str, Any]:
        """Legacy weather function - redirects to new implementation"""
        return await self._get_current_weather(location, aqi=True)
    
    async def _search_web(self, query: str, num_results: int = 3) -> Dict[str, Any]:
        """Search the web using DuckDuckGo (no API key required)."""
        try:
            # Simple DuckDuckGo instant answer API
            async with aiohttp.ClientSession() as session:
                url = f"https://api.duckduckgo.com/?q={query}&format=json"
                async with session.get(url) as response:
                    if response.status != 200:
                        return {"error": "Search service unavailable", "success": False}
                    
                    data = await response.json()
                    
                    results = []
                    
                    # Get instant answer if available
                    if data.get("AbstractText"):
                        results.append({
                            "title": data.get("Heading", "Instant Answer"),
                            "snippet": data.get("AbstractText"),
                            "url": data.get("AbstractURL", "")
                        })
                    
                    # Get related topics
                    for topic in data.get("RelatedTopics", [])[:num_results]:
                        if isinstance(topic, dict) and "Text" in topic:
                            results.append({
                                "title": topic.get("Text", "").split(" - ")[0],
                                "snippet": topic.get("Text", ""),
                                "url": topic.get("FirstURL", "")
                            })
                    
                    if not results:
                        return {
                            "query": query,
                            "message": "No instant results found. Try a more specific query.",
                            "success": True,
                            "results": []
                        }
                    
                    return {
                        "query": query,
                        "results": results[:num_results],
                        "success": True
                    }
        
        except Exception as e:
            logger.error(f"Search error: {e}")
            return {
                "error": f"Search error: {str(e)}",
                "success": False
            }
    
    async def _get_current_time(self, timezone: str = "UTC") -> Dict[str, Any]:
        """Get current time in specified timezone."""
        try:
            from datetime import datetime
            import pytz
            
            try:
                tz = pytz.timezone(timezone)
                current_time = datetime.now(tz)
                
                return {
                    "timezone": timezone,
                    "datetime": current_time.isoformat(),
                    "date": current_time.strftime("%Y-%m-%d"),
                    "time": current_time.strftime("%H:%M:%S"),
                    "day_of_week": current_time.strftime("%A"),
                    "success": True
                }
            except pytz.exceptions.UnknownTimeZoneError:
                # Fallback to UTC
                current_time = datetime.utcnow()
                return {
                    "timezone": "UTC",
                    "datetime": current_time.isoformat(),
                    "date": current_time.strftime("%Y-%m-%d"),
                    "time": current_time.strftime("%H:%M:%S"),
                    "day_of_week": current_time.strftime("%A"),
                    "note": f"Unknown timezone '{timezone}', using UTC",
                    "success": True
                }
        
        except Exception as e:
            return {
                "error": f"Time service error: {str(e)}",
                "success": False
            }


# Global instance
function_calling_service = FunctionCallingService()
