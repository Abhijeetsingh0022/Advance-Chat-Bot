"""
Streaming AI Provider Module
Implements true token-by-token streaming for OpenRouter, Gemini, and Groq providers.
"""
import logging
import asyncio
import json
from typing import Dict, AsyncIterator, Optional, Any
import httpx
from app.core.config import settings


logger = logging.getLogger(__name__)



class StreamingOpenRouterProvider:
    """OpenRouter streaming provider with SSE support."""


    def __init__(self, api_key: str, model: str):
        self.name = "openrouter"
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.model = model


    async def generate_stream(
        self, 
        prompt: str, 
        tools: Optional[list] = None,
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Generate streaming response from OpenRouter.
        Yields chunks as they arrive from the API.
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://chatbot.example.com",
                "X-Title": "ChatBot API"
            }


            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": kwargs.get("max_tokens", 1000),
                "temperature": kwargs.get("temperature", 0.7),
                "stream": True  # Enable streaming
            }


            # Add tools if provided
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
                logger.info(f"OpenRouter streaming with {len(tools)} tools enabled")


            logger.info(f"Starting OpenRouter stream for model: {self.model}")


            # Retry logic for rate limiting
            max_retries = 3
            retry_count = 0
            retry_delay = 1
            
            while retry_count <= max_retries:
                try:
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        async with client.stream(
                            "POST",
                            f"{self.base_url}/chat/completions",
                            headers=headers,
                            json=payload
                        ) as response:
                            # Handle rate limiting
                            if response.status_code == 429:
                                retry_after = response.headers.get("Retry-After")
                                if retry_after:
                                    retry_delay = int(retry_after)
                                else:
                                    retry_delay = min(2 ** retry_count, 32)
                                
                                if retry_count < max_retries:
                                    logger.warning(f"OpenRouter stream rate limited (429). Retry {retry_count + 1}/{max_retries} after {retry_delay}s")
                                    await asyncio.sleep(retry_delay)
                                    retry_count += 1
                                    continue
                            
                            # Handle 502 Bad Gateway (service temporarily unavailable)
                            if response.status_code == 502:
                                if retry_count < max_retries:
                                    retry_delay = min(2 ** retry_count, 16)
                                    logger.warning(f"OpenRouter service unavailable (502). Retry {retry_count + 1}/{max_retries} after {retry_delay}s")
                                    await asyncio.sleep(retry_delay)
                                    retry_count += 1
                                    continue
                                else:
                                    logger.error(f"OpenRouter service unavailable (502) after {max_retries} retries - fallback needed")
                                    raise httpx.HTTPStatusError(
                                        f"OpenRouter service temporarily unavailable. Please try again or select a different model.",
                                        request=response.request,
                                        response=response
                                    )
                            
                            response.raise_for_status()


                            buffer = ""
                            accumulated_text = ""
                            tool_calls_buffer = []
                            usage_info = None


                            async for chunk in response.aiter_text():
                                buffer += chunk
                                lines = buffer.split("\n")
                                buffer = lines.pop()  # Keep incomplete line in buffer


                                for line in lines:
                                    line = line.strip()
                                    if not line or line == "data: [DONE]":
                                        continue


                                    if line.startswith("data: "):
                                        try:
                                            data = json.loads(line[6:])  # Remove "data: " prefix
                                            
                                            # Debug: Log first response to understand format
                                            if not accumulated_text and "choices" in data:
                                                logger.debug(f"OpenRouter first chunk: {json.dumps(data)[:200]}")
                                            
                                            if "choices" in data and len(data["choices"]) > 0:
                                                choice = data["choices"][0]
                                                delta = choice.get("delta", {})
                                                
                                                # Check for text content
                                                if "content" in delta and delta["content"]:
                                                    content = delta["content"]
                                                    accumulated_text += content
                                                    
                                                    # Yield text chunk
                                                    yield {
                                                        "type": "content",
                                                        "content": content,
                                                        "accumulated": accumulated_text
                                                    }
                                                
                                                # Check for tool calls
                                                if "tool_calls" in delta:
                                                    for tool_call in delta["tool_calls"]:
                                                        tool_calls_buffer.append(tool_call)
                                                        
                                                        # Yield tool call chunk
                                                        yield {
                                                            "type": "tool_call",
                                                            "tool_call": tool_call
                                                        }
                                                
                                                # Check for finish reason
                                                if choice.get("finish_reason"):
                                                    logger.info(f"Stream finished: {choice['finish_reason']}")
                                            
                                            # Check for usage information
                                            if "usage" in data:
                                                usage_info = data["usage"]
                                        
                                        except json.JSONDecodeError as e:
                                            logger.warning(f"Failed to parse SSE data: {line[:100]}")
                                            continue
                            
                            # Exit retry loop on success
                            break
                            
                except httpx.TimeoutException as e:
                    logger.error(f"OpenRouter streaming timeout on attempt {retry_count + 1}/{max_retries}: {e}")
                    if retry_count < max_retries:
                        retry_delay = min(2 ** retry_count, 32)
                        await asyncio.sleep(retry_delay)
                        retry_count += 1
                        continue
                    raise


            # Send completion event
            yield {
                "type": "done",
                "accumulated": accumulated_text,
                "tool_calls": tool_calls_buffer if tool_calls_buffer else None,
                "model": self.model,
                "provider": "openrouter",
                "usage": usage_info or {
                    "prompt_tokens": 0,
                    "completion_tokens": len(accumulated_text.split()),
                    "total_tokens": len(accumulated_text.split())
                }
            }


            logger.info(f"OpenRouter stream completed: {len(accumulated_text)} chars")


        except Exception as e:
            logger.error(f"OpenRouter streaming error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "model": self.model,
                "provider": "openrouter"
            }



class StreamingGeminiProvider:
    """Gemini streaming provider with streamGenerateContent API."""


    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.name = "gemini"
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1"
        self.model = model


    async def generate_stream(
        self, 
        prompt: str,
        tools: Optional[list] = None,
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Generate streaming response from Gemini.
        Yields chunks as they arrive from the API.
        """
        try:
            url = f"{self.base_url}/models/{self.model}:streamGenerateContent?key={self.api_key}&alt=sse"


            payload = {
                "contents": [{
                    "role": "user",  # REQUIRED: Gemini needs explicit role
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "maxOutputTokens": kwargs.get("max_tokens", 1000),
                    "topP": 0.95,  # Updated from 0.8
                    "topK": 64     # Updated from 10
                }
            }


            # Note: Gemini streaming API does NOT support tools/function calling
            # Tools are only supported in the regular generateContent endpoint
            # So we skip adding tools here even if provided
            if tools:
                logger.info(f"Gemini streaming: Ignoring {len(tools)} tools (not supported in streaming API)")


            logger.info(f"Starting Gemini stream for model: {self.model}")


            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload
                ) as response:
                    response.raise_for_status()


                    buffer = ""
                    accumulated_text = ""
                    tool_calls_buffer = []
                    usage_info = None


                    async for chunk in response.aiter_text():
                        buffer += chunk
                        lines = buffer.split("\n")
                        buffer = lines.pop()


                        for line in lines:
                            line = line.strip()
                            if not line or line == "data: [DONE]":
                                continue


                            if line.startswith("data: "):
                                try:
                                    data = json.loads(line[6:])
                                    
                                    # Debug: Log first response to understand format
                                    if not accumulated_text and "candidates" in data:
                                        logger.debug(f"Gemini first chunk: {json.dumps(data)[:200]}")
                                    
                                    if "candidates" in data and len(data["candidates"]) > 0:
                                        candidate = data["candidates"][0]
                                        content = candidate.get("content", {})
                                        parts = content.get("parts", [])
                                        
                                        for part in parts:
                                            # Check for text content
                                            if "text" in part:
                                                text = part["text"]
                                                accumulated_text += text
                                                
                                                yield {
                                                    "type": "content",
                                                    "content": text,
                                                    "accumulated": accumulated_text
                                                }
                                            
                                            # Check for function calls
                                            if "functionCall" in part:
                                                func_call = part["functionCall"]
                                                tool_call = {
                                                    "id": f"call_{func_call.get('name', 'unknown')}",
                                                    "type": "function",
                                                    "function": {
                                                        "name": func_call.get("name", ""),
                                                        "arguments": func_call.get("args", {})
                                                    }
                                                }
                                                tool_calls_buffer.append(tool_call)
                                                
                                                yield {
                                                    "type": "tool_call",
                                                    "tool_call": tool_call
                                                }
                                    
                                    # Check for usage metadata
                                    if "usageMetadata" in data:
                                        usage_info = data["usageMetadata"]
                                
                                except json.JSONDecodeError:
                                    logger.warning(f"Failed to parse Gemini SSE data: {line[:100]}")
                                    continue


                    # Send completion event
                    yield {
                        "type": "done",
                        "accumulated": accumulated_text,
                        "tool_calls": tool_calls_buffer if tool_calls_buffer else None,
                        "model": self.model,
                        "provider": "gemini",
                        "usage": {
                            "prompt_tokens": usage_info.get("promptTokenCount", 0) if usage_info else 0,
                            "completion_tokens": usage_info.get("candidatesTokenCount", 0) if usage_info else len(accumulated_text.split()),
                            "total_tokens": usage_info.get("totalTokenCount", 0) if usage_info else len(accumulated_text.split())
                        }
                    }


                    logger.info(f"Gemini stream completed: {len(accumulated_text)} chars")


        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "model": self.model,
                "provider": "gemini"
            }


    def _convert_tools_to_gemini_format(self, openai_tools: list) -> list:
        """Convert OpenAI tool format to Gemini function declarations."""
        try:
            gemini_functions = []
            
            for tool in openai_tools:
                if tool.get("type") != "function":
                    continue
                
                func = tool.get("function", {})
                params = func.get("parameters", {})
                
                gemini_func = {
                    "name": func.get("name", ""),
                    "description": func.get("description", ""),
                    "parameters": {
                        "type": params.get("type", "object"),
                        "properties": params.get("properties", {}),
                        "required": params.get("required", [])
                    }
                }
                
                gemini_functions.append(gemini_func)
            
            if gemini_functions:
                return [{"functionDeclarations": gemini_functions}]
            
            return []
        except Exception as e:
            logger.error(f"Error converting tools to Gemini format: {e}")
            return []



class StreamingGroqProvider:
    """Groq streaming provider with SSE support."""


    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        self.name = "groq"
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = model


    async def generate_stream(
        self, 
        prompt: str,
        tools: Optional[list] = None,
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Generate streaming response from Groq.
        Yields chunks as they arrive from the API.
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }


            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": kwargs.get("max_tokens", 1000),
                "temperature": kwargs.get("temperature", 0.7),
                "stream": True  # Enable streaming
            }


            # Groq supports tools but not in streaming mode yet
            if tools:
                logger.warning("Groq doesn't support tools in streaming mode yet")


            logger.info(f"Starting Groq stream for model: {self.model}")


            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    response.raise_for_status()


                    buffer = ""
                    accumulated_text = ""
                    usage_info = None


                    async for chunk in response.aiter_text():
                        buffer += chunk
                        lines = buffer.split("\n")
                        buffer = lines.pop()


                        for line in lines:
                            line = line.strip()
                            if not line or line == "data: [DONE]":
                                continue


                            if line.startswith("data: "):
                                try:
                                    data = json.loads(line[6:])
                                    
                                    if "choices" in data and len(data["choices"]) > 0:
                                        choice = data["choices"][0]
                                        delta = choice.get("delta", {})
                                        
                                        if "content" in delta and delta["content"]:
                                            content = delta["content"]
                                            accumulated_text += content
                                            
                                            yield {
                                                "type": "content",
                                                "content": content,
                                                "accumulated": accumulated_text
                                            }
                                        
                                        if choice.get("finish_reason"):
                                            logger.info(f"Stream finished: {choice['finish_reason']}")
                                    
                                    if "usage" in data:
                                        usage_info = data["usage"]
                                
                                except json.JSONDecodeError:
                                    logger.warning(f"Failed to parse Groq SSE data: {line[:100]}")
                                    continue


                    # Send completion event
                    yield {
                        "type": "done",
                        "accumulated": accumulated_text,
                        "tool_calls": None,
                        "model": self.model,
                        "provider": "groq",
                        "usage": usage_info or {
                            "prompt_tokens": 0,
                            "completion_tokens": len(accumulated_text.split()),
                            "total_tokens": len(accumulated_text.split())
                        }
                    }


                    logger.info(f"Groq stream completed: {len(accumulated_text)} chars")


        except Exception as e:
            logger.error(f"Groq streaming error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "model": self.model,
                "provider": "groq"
            }



async def create_streaming_provider(model: str):
    """
    Factory function to create appropriate streaming provider based on model name.
    
    Args:
        model: Model identifier (e.g., "gemini-2.5-flash", "gpt-4", "llama-3.1-8b-instant")
    
    Returns:
        Streaming provider instance
    """
    model_lower = model.lower()
    
    # Gemini models
    if "gemini" in model_lower:
        return StreamingGeminiProvider(
            api_key=settings.AI_SERVICES__GEMINI_API_KEY,
            model=model
        )
    
    # Groq models (Llama)
    if "llama" in model_lower or "groq" in model_lower:
        return StreamingGroqProvider(
            api_key=settings.AI_SERVICES__GROQ_API_KEY,
            model=model
        )
    
    # OpenRouter models (default for everything else)
    # Select API key based on model type
    api_key = None
    
    if "gpt-oss" in model_lower or "gpt-oss-20b" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS
    elif "deepseek" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK
    elif "qwen3-coder" in model_lower or "coder" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER
    elif "qwen2.5-vl" in model_lower or "qwen-vl" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_VL
    elif "gemma" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA
    elif "grok" in model_lower or "x-ai" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_XAI
    elif "moonshot" in model_lower or "kimi" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_MOONSHOT
    elif "nemotron" in model_lower or "nvidia" in model_lower:
        api_key = settings.AI_SERVICES__OPEN_ROUTER_API_KEY_NEMOTRON
    
    # Fallback to any available key
    if not api_key:
        api_keys = [
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_VL,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_MOONSHOT,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_NEMOTRON,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_XAI,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_1,
            settings.AI_SERVICES__OPEN_ROUTER_API_KEY_2,
        ]
        api_key = next((key for key in api_keys if key), None)
    
    if not api_key:
        raise ValueError(f"No API key configured for model: {model}")
    
    return StreamingOpenRouterProvider(
        api_key=api_key,
        model=model
    )
