import logging
import asyncio
import random
import re
import json
from typing import Dict, List, Optional, Literal
import httpx
from app.core.config import settings


logger = logging.getLogger(__name__)



class AIProvider:
    """Base class for AI providers."""


    def __init__(self, name: str, api_key: str, base_url: str, model: str = None):
        self.name = name
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.client = httpx.AsyncClient(timeout=30.0)


    async def generate(self, prompt: str, **kwargs) -> Dict:
        """Generate response for the given prompt."""
        raise NotImplementedError


    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()



class OpenRouterProvider(AIProvider):
    """OpenRouter AI provider with configurable models."""


    def __init__(self, api_key: str, model: str):
        super().__init__("openrouter", api_key, "https://openrouter.ai/api/v1", model)


    async def generate(self, prompt: str, **kwargs) -> Dict:
        import time
        start_time = time.time()
        try:
            # OpenRouter requires specific headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://chatbot.example.com",
                "X-Title": "ChatBot API"
            }


            # Build message content
            messages = []
            
            # Check if this is a vision model and we have image data
            image_data = kwargs.get("image_data")
            image_format = kwargs.get("image_format", "image/jpeg")
            
            if image_data and "vl" in self.model.lower():  # Vision model
                # For vision models, create a message with both text and image
                message_content = [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image_format};base64,{image_data}"
                        }
                    }
                ]
                messages.append({"role": "user", "content": message_content})
            else:
                # Standard text-only message
                messages.append({"role": "user", "content": prompt})


            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", 1000),
                "temperature": kwargs.get("temperature", 0.7)
            }


            # Add tools if provided (for function calling)
            tools = kwargs.get("tools")
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"


            logger.info(f"OpenRouter request - Model: {self.model}, Headers: {list(headers.keys())}, Payload keys: {list(payload.keys())}")


            # Retry logic with exponential backoff for rate limiting
            max_retries = 3
            retry_count = 0
            retry_delay = 1  # Start with 1 second
            
            while retry_count <= max_retries:
                try:
                    response = await self.client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=120.0
                    )
                    
                    # Handle rate limiting with exponential backoff
                    if response.status_code == 429:
                        retry_after = response.headers.get("Retry-After")
                        if retry_after:
                            retry_delay = int(retry_after)
                        else:
                            retry_delay = min(2 ** retry_count, 32)  # Exponential backoff, max 32s
                        
                        if retry_count < max_retries:
                            logger.warning(f"OpenRouter rate limited (429). Retry {retry_count + 1}/{max_retries} after {retry_delay}s")
                            await asyncio.sleep(retry_delay)
                            retry_count += 1
                            continue
                        else:
                            logger.error(f"OpenRouter rate limited (429) - max retries exceeded")
                            response.raise_for_status()
                    
                    # For other errors, raise immediately
                    if response.status_code != 200:
                        logger.error(f"OpenRouter API error {response.status_code}: {response.text}")
                    
                    response.raise_for_status()
                    break  # Success - exit retry loop
                    
                except httpx.TimeoutException as e:
                    logger.error(f"OpenRouter timeout on attempt {retry_count + 1}/{max_retries}: {e}")
                    if retry_count < max_retries:
                        retry_delay = min(2 ** retry_count, 32)
                        await asyncio.sleep(retry_delay)
                        retry_count += 1
                        continue
                    raise


            data = response.json()
            choice = data["choices"][0]
            message = choice["message"]
            
            # Check if the model wants to call a function
            tool_calls = message.get("tool_calls")
            
            reply = message.get("content", "")
            usage = data.get("usage", {})


            result = {
                "reply": reply,
                "model": self.model,
                "provider": "openrouter",
                "usage": {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                }
            }
            
            # Include tool_calls if present
            if tool_calls:
                result["tool_calls"] = tool_calls
            
            duration = (time.time() - start_time) * 1000
            logger.info(f"PERF: OpenRouterProvider.generate({self.model}) completed in {duration:.2f}ms")
            return result
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"OpenRouter API error for model {self.model} after {duration:.2f}ms: {e}")
            raise



class GroqProvider(AIProvider):
    """Groq AI provider."""


    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        super().__init__("groq", api_key, "https://api.groq.com/openai/v1", model)


    async def generate(self, prompt: str, **kwargs) -> Dict:
        import time
        start_time = time.time()
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }


            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": kwargs.get("max_tokens", 1000),
                "temperature": kwargs.get("temperature", 0.7)
            }


            # Add tools if provided (for function calling in non-streaming mode)
            tools = kwargs.get("tools")
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
                logger.info(f"Groq (non-streaming): Added {len(tools)} tools for function calling")


            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()


            data = response.json()
            choice = data["choices"][0]
            message = choice["message"]
            
            # Check if the model wants to call a function
            tool_calls = message.get("tool_calls")
            
            reply = message.get("content", "")
            usage = data.get("usage", {})


            result = {
                "reply": reply,
                "model": self.model,
                "provider": "groq",
                "usage": {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                }
            }
            
            # Include tool_calls if present
            if tool_calls:
                result["tool_calls"] = tool_calls
                logger.info(f"Groq (non-streaming): Model requested {len(tool_calls)} tool calls")


            duration = (time.time() - start_time) * 1000
            logger.info(f"PERF: GroqProvider.generate({self.model}) completed in {duration:.2f}ms")
            return result
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"Groq API error for model {self.model} after {duration:.2f}ms: {e}")
            raise



class GeminiProvider(AIProvider):
    """Google Gemini AI provider."""


    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        super().__init__("gemini", api_key, "https://generativelanguage.googleapis.com/v1", model)


    async def generate(self, prompt: str, **kwargs) -> Dict:
        import time
        start_time = time.time()
        try:
            # Use v1beta endpoint for function calling support, v1 for basic calls
            endpoint_version = "v1beta" if kwargs.get("tools") else "v1"
            url = f"https://generativelanguage.googleapis.com/{endpoint_version}/models/{self.model}:generateContent?key={self.api_key}"


            # Build the content parts with required role field
            parts = [{"text": prompt}]


            payload = {
                "contents": [{
                    "role": "user",  # REQUIRED: Gemini needs explicit role
                    "parts": parts
                }],
                "generationConfig": {
                    "temperature": kwargs.get("temperature", 0.7),
                    "maxOutputTokens": kwargs.get("max_tokens", 1000),
                    "topP": 0.95,
                    "topK": 64
                }
            }


            # Add tools if provided (for function calling)
            # Note: Gemini uses a different format for tools, so we convert OpenAI format
            tools = kwargs.get("tools")
            if tools:
                logger.info(f"Gemini: Converting {len(tools)} tools to Gemini format")
                gemini_tools = self._convert_tools_to_gemini_format(tools)
                if gemini_tools:
                    payload["tools"] = gemini_tools
                    logger.info(f"Gemini: Added {len(gemini_tools)} tool declarations to payload")
                else:
                    logger.warning("Gemini: Tool conversion resulted in empty tools list")
            else:
                logger.info("Gemini: No tools provided in kwargs")


            logger.info(f"Gemini API request to {self.model}")
            logger.debug(f"Gemini payload: {json.dumps(payload, indent=2)[:500]}...")
            
            # Add error handling for Gemini API
            try:
                response = await self.client.post(url, json=payload, timeout=120.0)
                
                # Log full response for debugging 400 errors
                if response.status_code != 200:
                    logger.error(f"Gemini API error {response.status_code}: {response.text}")
                
                response.raise_for_status()
            except Exception as e:
                logger.error(f"Gemini request failed: {e}")
                raise


            data = response.json()
            logger.debug(f"Gemini API response: {json.dumps(data, indent=2)[:1000]}...")
            
            # Check if response has valid candidates
            if not data.get("candidates") or len(data["candidates"]) == 0:
                logger.error(f"Gemini returned no candidates: {data}")
                raise Exception("Gemini returned no response candidates")
            
            candidate = data["candidates"][0]
            content = candidate.get("content", {})
            parts_response = content.get("parts", [])
            
            if not parts_response:
                logger.error(f"Gemini returned no parts in response: {data}")
                raise Exception("Gemini returned empty response parts")
            
            # Check if there's a function call in the response
            first_part = parts_response[0]
            tool_calls = None
            reply = ""
            
            if "functionCall" in first_part:
                # Gemini returned a function call
                func_call = first_part["functionCall"]
                tool_calls = [{
                    "id": f"call_{func_call.get('name', 'unknown')}",
                    "type": "function",
                    "function": {
                        "name": func_call.get("name", ""),
                        "arguments": func_call.get("args", {})
                    }
                }]
            elif "text" in first_part:
                reply = first_part["text"]
            else:
                logger.warning(f"Unexpected Gemini response format: {first_part}")
                reply = str(first_part)


            # Extract usage information if available
            usage = data.get("usageMetadata", {})
            prompt_tokens = usage.get("promptTokenCount", 0)
            completion_tokens = usage.get("candidatesTokenCount", 0)
            total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)


            duration = (time.time() - start_time) * 1000
            logger.info(f"PERF: GeminiProvider.generate({self.model}) completed in {duration:.2f}ms")
            
            result = {
                "reply": reply,
                "model": self.model,
                "provider": "gemini",
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens
                }
            }
            
            if tool_calls:
                result["tool_calls"] = tool_calls
            
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"Gemini API error for model {self.model} after {duration:.2f}ms: {e}")
            raise
    
    def _convert_tools_to_gemini_format(self, openai_tools: List[Dict]) -> List[Dict]:
        """Convert OpenAI tool format to Gemini function declarations format."""
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



class MockProvider:
    """Mock AI provider for local development and testing."""


    async def generate(self, prompt: str, **kwargs) -> Dict:
        import time
        start_time = time.time()
        try:
            logger.debug(f"Generating mock response for prompt: {prompt[:50]}...")
            # Simulate API delay
            await asyncio.sleep(0.1)
            reply = f"Echo: {prompt}"
            duration = (time.time() - start_time) * 1000
            logger.info(f"PERF: MockProvider.generate completed in {duration:.2f}ms")
            logger.debug("Mock response generated successfully.")
            return {
                "reply": reply,
                "model": "mock/v1",
                "provider": "mock",
                "usage": {"tokens": len(prompt.split())}
            }
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"Mock provider error after {duration:.2f}ms: {e}")
            raise


    async def close(self):
        """Mock close method."""
        pass



class AIProviderManager:
    """Manages multiple AI providers with intelligent routing."""


    def __init__(self):
        self.providers: Dict[str, List[AIProvider]] = {
            "coding": [],      # For coding questions
            "reasoning": [],   # For reasoning tasks
            "general": [],     # For general purpose
            "image": [],       # For image analysis
            "text": []         # For text processing
        }
        self._initialize_providers()


    def _initialize_providers(self):
        """Initialize available AI providers with specialized routing."""
        
        logger.info("Starting provider initialization...")
        
        # ============ CODING MODELS ============
        # Qwen Coder (for coding questions - PRIMARY)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER:
            self.providers["coding"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER, "qwen/qwen3-coder:free")
            )
            logger.debug("✅ Added Qwen Coder (coding)")
        
        # xAI: Grok 2 (for coding questions - BACKUP)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_XAI') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_XAI:
            self.providers["coding"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_XAI, "x-ai/grok-2:free")
            )
            logger.debug("✅ Added xAI/Grok (coding)")

        # ============ REASONING/ANALYSIS MODELS ============
        # Kimi K2 (for reasoning - PRIMARY) - MODEL DISABLED: Returns 404
        # if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_MOONSHOT') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_MOONSHOT:
        #     self.providers["reasoning"].append(
        #         OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_MOONSHOT, "moonshotai/kimi-k2:free")
        #     )
        #     logger.debug("✅ Added Moonshot Kimi (reasoning)")
        
        # DeepSeek V3 (for reasoning - PRIMARY) - Fixed model ID
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK:
            self.providers["reasoning"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK, "deepseek/deepseek-v3:free")
            )
            logger.debug("✅ Added DeepSeek V3 (reasoning)")


        # ============ GENERAL PURPOSE MODELS ============
        # gpt-oss-20b (for general purpose - DEFAULT MODEL)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS:
            self.providers["general"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS, "openai/gpt-oss-20b:free")
            )
            logger.debug("✅ Added GPT-OSS (general)")


        # llama 3.1 8B instant free (for general purpose and personalization)
        if hasattr(settings, 'AI_SERVICES__GROQ_API_KEY') and settings.AI_SERVICES__GROQ_API_KEY:
            self.providers["general"].append(
                GroqProvider(settings.AI_SERVICES__GROQ_API_KEY, "llama-3.1-8b-instant")
            )
            logger.debug("✅ Added Groq Llama (general)")


        # ============ VISION/IMAGE MODELS ============
        # Gemma 3 27B (for image analysis - PRIMARY)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA:
            self.providers["image"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA, "google/gemma-3-27b-it:free")
            )
            logger.debug("✅ Added Gemma (image)")


        # Qwen VL 32B (for image text extraction and image analysis - PRIMARY VL)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_VL') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_VL:
            self.providers["image"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_VL, "qwen/qwen2.5-vl-32b-instruct:free")
            )
            logger.debug("✅ Added Qwen VL (image)")


        # NVIDIA Nemotron Nano 12B V2 VL (for image analysis - BACKUP VL)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_NEMOTRON') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_NEMOTRON:
            self.providers["image"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_NEMOTRON, "nvidia/nemotron-nano-12b-v2-vl:free")
            )
            logger.debug("✅ Added Nemotron (image)")


        # Fallback vision model API keys
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_1') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_1:
            self.providers["image"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_1, "qwen/qwen2.5-vl-32b-instruct:free")
            )
            logger.debug("✅ Added Fallback Key 1 (image)")


        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_2') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_2:
            self.providers["image"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_2, "google/gemma-3-27b-it:free")
            )
            logger.debug("✅ Added Fallback Key 2 (image)")


        # ============ TEXT/GENERAL MODELS ============
        # GPT-OSS 20B for text processing (PRIMARY - more reliable than Gemini)
        if hasattr(settings, 'AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS') and settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS:
            self.providers["text"].append(
                OpenRouterProvider(settings.AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS, "openai/gpt-oss-20b:free")
            )
            logger.debug("✅ Added GPT-OSS (text)")


        # Gemini 2.5 Flash (for text processing - FALLBACK)
        # Note: Gemini sometimes returns 400 errors, so using as secondary option
        if hasattr(settings, 'AI_SERVICES__GEMINI_API_KEY') and settings.AI_SERVICES__GEMINI_API_KEY:
            self.providers["text"].append(
                GeminiProvider(settings.AI_SERVICES__GEMINI_API_KEY, "gemini-2.5-flash")
            )
            logger.debug("✅ Added Gemini (text)")


        # Fallback to mock provider if no real providers configured
        total_providers = sum(len(providers) for providers in self.providers.values())
        if total_providers == 0:
            logger.warning("No AI providers configured, using mock provider")
            for category in self.providers:
                self.providers[category].append(MockProvider())


        # Log initialization summary
        logger.info(f"✅ Initialized AI providers: {dict((k, len(v)) for k, v in self.providers.items())}")
        logger.info(f"📊 Provider details:")
        for category, providers in self.providers.items():
            if providers:
                for provider in providers:
                    logger.info(f"  - {category}: {provider.name} ({provider.model})")
        logger.info(f"Initialized AI providers: {dict((k, len(v)) for k, v in self.providers.items())}")
        logger.info(f"Provider details:")
        for category, providers in self.providers.items():
            for provider in providers:
                logger.info(f"  - {category}: {provider.name} ({provider.model})")


    def _detect_request_type(self, prompt: str) -> str:
        """Detect the type of request based on prompt content."""
        prompt_lower = prompt.lower()


        # Coding questions - highest priority
        coding_keywords = [
            'code', 'programming', 'function', 'class', 'debug', 'error', 'syntax', 'algorithm',
            'python', 'javascript', 'java', 'c++', 'html', 'css', 'sql', 'database', 'query',
            'api', 'endpoint', 'server', 'client', 'framework', 'library', 'module',
            'variable', 'loop', 'condition', 'array', 'object', 'method', 'inheritance'
        ]
        if any(keyword in prompt_lower for keyword in coding_keywords):
            return "coding"


        # Image analysis - check for image-related terms
        image_keywords = [
            'image', 'picture', 'photo', 'visual', 'analyze image', 'extract text', 'ocr',
            'vision', 'describe image', 'what do you see', 'identify objects', 'colors',
            'composition', 'artwork', 'drawing', 'screenshot', 'diagram', 'chart', 'graph'
        ]
        if any(keyword in prompt_lower for keyword in image_keywords):
            return "image"


        # Reasoning tasks - analytical thinking
        reasoning_keywords = [
            'explain', 'why', 'how', 'analyze', 'reason', 'logic', 'think', 'understand',
            'concept', 'theory', 'because', 'therefore', 'conclusion', 'evidence',
            'argument', 'pros and cons', 'advantages', 'disadvantages', 'compare',
            'contrast', 'difference between', 'relationship', 'cause and effect'
        ]
        if any(keyword in prompt_lower for keyword in reasoning_keywords):
            return "reasoning"


        # Text processing - summarization, translation, etc.
        text_keywords = [
            'summarize', 'summary', 'translate', 'translation', 'grammar', 'spelling',
            'proofread', 'edit', 'rewrite', 'paraphrase', 'article', 'text', 'document',
            'paragraph', 'sentence', 'word', 'language', 'meaning', 'definition'
        ]
        if any(keyword in prompt_lower for keyword in text_keywords):
            return "text"


        # Default to general purpose
        return "general"


    async def generate(self, prompt: str, request_type: Optional[str] = None, model: Optional[str] = None, **kwargs) -> Dict:
        """Generate response using appropriate provider based on request type or specific model."""
        import time
        start_time = time.time()
        
        # If a specific model is requested, find and use that provider
        if model:
            logger.debug(f"Specific model requested: {model}")
            for category_providers in self.providers.values():
                for provider in category_providers:
                    if provider.model == model:
                        try:
                            logger.debug(f"Using requested provider: {provider.name} ({provider.model})")
                            result = await provider.generate(prompt, **kwargs)
                            logger.info(f"Successfully generated response using requested {provider.name} ({provider.model})")
                            result["request_type"] = request_type or "general"
                            duration = (time.time() - start_time) * 1000
                            logger.info(f"PERF: AIProviderManager.generate(model={model}) completed in {duration:.2f}ms")
                            return result
                        except Exception as e:
                            error_msg = f"Requested provider {provider.name} ({provider.model}) failed: {str(e)}"
                            logger.error(error_msg)
                            raise Exception(error_msg)
            
            # If we get here, the requested model wasn't found
            logger.warning(f"Requested model '{model}' not found, falling back to automatic selection")
        
        # Original logic: auto-select based on request_type
        if request_type is None:
            request_type = self._detect_request_type(prompt)


        providers = self.providers.get(request_type, self.providers["general"])


        if not providers:
            # Fallback to any available provider
            for category_providers in self.providers.values():
                if category_providers:
                    providers = category_providers
                    break


        if not providers:
            raise Exception("No AI providers available")


        errors = []


        # Try providers in random order for load balancing
        provider_indices = list(range(len(providers)))
        random.shuffle(provider_indices)


        for idx in provider_indices:
            provider = providers[idx]


            try:
                logger.debug(f"Trying provider: {provider.name} ({provider.model}) for {request_type}")
                result = await provider.generate(prompt, **kwargs)
                logger.info(f"Successfully generated response using {provider.name} ({provider.model})")
                result["request_type"] = request_type
                duration = (time.time() - start_time) * 1000
                logger.info(f"PERF: AIProviderManager.generate({request_type}) completed in {duration:.2f}ms")
                return result
            except Exception as e:
                error_msg = f"Provider {provider.name} ({provider.model}) failed: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)


        # If all providers failed, raise the last error
        duration = (time.time() - start_time) * 1000
        logger.error(f"PERF: AIProviderManager.generate({request_type}) failed after {duration:.2f}ms")
        raise Exception(f"All AI providers failed for {request_type}: {'; '.join(errors)}")


    async def close(self):
        """Close all provider connections."""
        for category_providers in self.providers.values():
            for provider in category_providers:
                try:
                    await provider.close()
                except Exception as e:
                    logger.error(f"Error closing provider {provider.name}: {e}")



# Global provider manager instance
provider_manager = AIProviderManager()



async def generate_response(prompt: str, request_type: Optional[str] = None, **kwargs) -> Dict:
    """Generate AI response using the provider manager."""
    # Basic validation
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("Prompt must be a non-empty string")


    if len(prompt.strip()) > 50000:  # Reasonable limit
        raise ValueError("Prompt is too long (max 50,000 characters)")


    # Validate request_type
    valid_types = ["coding", "reasoning", "general", "image", "text"]
    if request_type and request_type not in valid_types:
        raise ValueError(f"Invalid request_type. Must be one of: {', '.join(valid_types)}")


    # Check for potentially harmful content - use more specific patterns
    harmful_patterns = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:\s*',              # JavaScript URLs (with space or content after)
        r'data:text/html',              # Data URLs with HTML
        r'data:image/svg\+xml.*<script',  # SVG with script
        r'on\w+\s*=\s*["\']',          # Event handlers with quotes
    ]


    prompt_lower = prompt.lower()
    for pattern in harmful_patterns:
        if re.search(pattern, prompt_lower):
            raise ValueError("Prompt contains potentially harmful content")


    return await provider_manager.generate(prompt, request_type, **kwargs)



# Backward compatibility
class ProviderInterface:
    """Backward compatibility interface."""


    async def generate(self, prompt: str) -> Dict:
        return await generate_response(prompt)



provider = ProviderInterface()
