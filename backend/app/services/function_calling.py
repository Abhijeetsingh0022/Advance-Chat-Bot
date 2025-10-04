"""Function calling tools for AI agents."""
import json
import aiohttp
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import re
from app.core.config import settings

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
            "name": "get_weather",
            "description": "Get current weather information for a specific location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or location, e.g., 'London', 'New York', 'Tokyo'"
                    },
                    "units": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature units (default: celsius)"
                    }
                },
                "required": ["location"]
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
        self.weather_api_key = weather_api_key or getattr(settings, 'OPENWEATHERMAP_API_KEY', '')
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
            elif function_name == "get_weather":
                return await self._get_weather(
                    arguments.get("location", ""),
                    arguments.get("units", "celsius")
                )
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
    
    async def _get_weather(self, location: str, units: str = "celsius") -> Dict[str, Any]:
        """Get weather information using OpenWeatherMap API."""
        try:
            if not self.weather_api_key:
                return {"error": "Weather API key not configured", "success": False}
            
            async with aiohttp.ClientSession() as session:
                # Convert units for API call
                api_units = "imperial" if units == "fahrenheit" else "metric"
                
                # Get weather data from OpenWeatherMap
                weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={self.weather_api_key}&units={api_units}"
                
                async with session.get(weather_url) as response:
                    if response.status == 404:
                        return {"error": f"Location not found: {location}", "success": False}
                    elif response.status == 401:
                        return {"error": "Invalid weather API key", "success": False}
                    elif response.status != 200:
                        return {"error": "Weather service unavailable", "success": False}
                    
                    weather_data = await response.json()
                    
                    # Extract weather information
                    main = weather_data.get("main", {})
                    weather = weather_data.get("weather", [{}])[0]
                    wind = weather_data.get("wind", {})
                    sys = weather_data.get("sys", {})
                    
                    return {
                        "location": f"{weather_data.get('name', location)}, {sys.get('country', '')}",
                        "temperature": main.get("temp"),
                        "feels_like": main.get("feels_like"),
                        "units": units,
                        "condition": weather.get("description", "").title(),
                        "humidity": main.get("humidity"),
                        "pressure": main.get("pressure"),
                        "wind_speed": wind.get("speed"),
                        "wind_direction": wind.get("deg"),
                        "cloudiness": weather_data.get("clouds", {}).get("all"),
                        "visibility": weather_data.get("visibility"),
                        "sunrise": sys.get("sunrise"),
                        "sunset": sys.get("sunset"),
                        "success": True
                    }
        
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return {
                "error": f"Weather service error: {str(e)}",
                "success": False
            }
    
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
