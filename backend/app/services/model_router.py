"""
Smart Model Router - Intelligent model selection based on query complexity and cost optimization.

This module analyzes queries and routes them to the most cost-effective model while maintaining quality.
"""
import logging
import re
from typing import Dict, Optional, Tuple, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class QueryComplexity(str, Enum):
    """Query complexity levels."""
    SIMPLE = "simple"          # Short, straightforward questions
    MODERATE = "moderate"      # Standard queries
    COMPLEX = "complex"        # Multi-step reasoning
    EXPERT = "expert"          # Requires specialized knowledge


class ModelTier(str, Enum):
    """Model capability tiers."""
    BASIC = "basic"           # Free/cheap models (Gemma, GPT-OSS)
    STANDARD = "standard"     # Mid-tier (Llama 3.1, Qwen)
    ADVANCED = "advanced"     # Premium (GPT-4, Claude, DeepSeek)
    SPECIALIZED = "specialized"  # Task-specific (Vision, Code)


# Model cost per 1M tokens (input + output average)
MODEL_COSTS = {
    # Free models
    "openai/gpt-oss-20b:free": 0.0,
    "google/gemma-3-27b-it:free": 0.0,
    "x-ai/grok-4-fast:free": 0.0,
    "deepseek/deepseek-chat-v3.1:free": 0.0,
    "qwen/qwen3-coder": 0.0,
    "qwen/qwen2.5-vl-72b-instruct:free": 0.0,
    
    # Paid models (example costs - update based on actual pricing)
    "llama-3.1-8b-instant": 0.05,  # Groq - very cheap
    "gemini-2.5-flash": 0.10,
    "gpt-3.5-turbo": 0.50,
    "claude-3-sonnet": 3.00,
    "gpt-4": 30.00,
    "claude-3-opus": 15.00,
}

# Model capabilities and specializations
MODEL_CAPABILITIES = {
    "openai/gpt-oss-20b:free": {
        "tier": ModelTier.BASIC,
        "strengths": ["general", "conversation"],
        "weaknesses": ["coding", "reasoning", "context_length"],
        "max_context": 8192,
        "supports_streaming": True,
        "supports_function_calling": False
    },
    "google/gemma-3-27b-it:free": {
        "tier": ModelTier.BASIC,
        "strengths": ["general", "reasoning"],
        "weaknesses": ["coding"],
        "max_context": 8192,
        "supports_streaming": True,
        "supports_function_calling": False
    },
    "gemini-2.5-flash": {
        "tier": ModelTier.STANDARD,
        "strengths": ["general", "reasoning", "function_calling", "long_context"],
        "weaknesses": [],
        "max_context": 1000000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "qwen/qwen3-coder:free": {
        "tier": ModelTier.ADVANCED,
        "strengths": ["coding", "debugging", "technical"],
        "weaknesses": ["image"],
        "max_context": 32768,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "x-ai/grok-4-fast:free": {
        "tier": ModelTier.ADVANCED,
        "strengths": ["coding", "reasoning", "technical"],
        "weaknesses": ["general", "creative"],
        "max_context": 128000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "deepseek/deepseek-chat-v3.1:free": {
        "tier": ModelTier.ADVANCED,
        "strengths": ["reasoning", "complex_logic", "analysis"],
        "weaknesses": ["coding"],
        "max_context": 64000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "meta-llama/llama-3.1-8b-instruct": {
        "tier": ModelTier.STANDARD,
        "strengths": ["general", "reasoning"],
        "weaknesses": ["complex_reasoning"],
        "max_context": 128000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "qwen/qwen2.5-vl-72b-instruct:free": {
        "tier": ModelTier.SPECIALIZED,
        "strengths": ["vision", "image_analysis", "multimodal"],
        "weaknesses": [],
        "max_context": 32768,
        "supports_streaming": True,
        "supports_function_calling": False
    },
    "qwen/qwen-vl-max:free": {
        "tier": ModelTier.SPECIALIZED,
        "strengths": ["vision", "image_analysis", "multimodal"],
        "weaknesses": [],
        "max_context": 32768,
        "supports_streaming": True,
        "supports_function_calling": False
    },
    "gpt-4": {
        "tier": ModelTier.ADVANCED,
        "strengths": ["reasoning", "coding", "complex_tasks", "function_calling"],
        "weaknesses": ["cost", "speed"],
        "max_context": 128000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
    "claude-3-opus": {
        "tier": ModelTier.ADVANCED,
        "strengths": ["reasoning", "writing", "analysis", "function_calling"],
        "weaknesses": ["cost"],
        "max_context": 200000,
        "supports_streaming": True,
        "supports_function_calling": True
    },
}


class QueryAnalyzer:
    """Analyzes query complexity and requirements."""
    
    def __init__(self):
        # Patterns for different complexity indicators
        self.simple_patterns = [
            r"^(what|who|when|where|which|how old|how many)\s",
            r"^(yes|no|maybe|sure|okay|ok)\s*$",
            r"^(hi|hello|hey|greetings|good morning|good evening)",
            r"^(thank|thanks|thx)",
        ]
        
        self.complex_patterns = [
            r"(explain|analyze|compare|contrast|evaluate|critique|justify)",
            r"(step by step|in detail|comprehensive|thorough)",
            r"(why.*how|how.*why)",  # Multi-part questions
            r"(pros and cons|advantages.*disadvantages)",
            r"(relationship between|connection between)",
        ]
        
        self.expert_patterns = [
            r"(algorithm|optimization|performance|scalability)",
            r"(architecture|design pattern|best practice)",
            r"(implement|build|create|develop).*system",
            r"(debug|troubleshoot|fix).*error",
            r"(refactor|optimize|improve).*code",
        ]
        
        self.code_indicators = [
            "def ", "function ", "class ", "import ", "const ", "let ", "var ",
            "```", "```python", "```javascript", "```java",
            "=>", "->", "lambda", "async", "await",
        ]

    def analyze_complexity(self, query: str, context_length: int = 0) -> Tuple[QueryComplexity, Dict]:
        """
        Analyze query complexity and return complexity level with metadata.
        
        Args:
            query: The user's query
            context_length: Length of conversation context (in tokens)
            
        Returns:
            Tuple of (complexity_level, analysis_metadata)
        """
        query_lower = query.lower()
        word_count = len(query.split())
        char_count = len(query)
        
        # Initialize analysis metadata
        analysis = {
            "word_count": word_count,
            "char_count": char_count,
            "context_length": context_length,
            "has_code": False,
            "question_count": 0,
            "technical_terms": 0,
            "reasoning_required": False,
            "multi_step": False,
        }
        
        # Check for code blocks
        if any(indicator in query for indicator in self.code_indicators):
            analysis["has_code"] = True
        
        # Count questions
        analysis["question_count"] = query.count("?")
        
        # Count technical terms
        technical_terms = [
            "algorithm", "database", "api", "framework", "library", "module",
            "function", "class", "method", "variable", "array", "object",
            "async", "concurrent", "parallel", "distributed", "scalable",
        ]
        analysis["technical_terms"] = sum(1 for term in technical_terms if term in query_lower)
        
        # Check for reasoning requirements
        for pattern in self.complex_patterns:
            if re.search(pattern, query_lower):
                analysis["reasoning_required"] = True
                break
        
        # Check for multi-step requirements
        if re.search(r"\d+\.\s|\d+\)\s|first.*then|step \d+", query_lower):
            analysis["multi_step"] = True
        
        # Determine complexity
        complexity_score = 0
        
        # Simple query indicators
        for pattern in self.simple_patterns:
            if re.search(pattern, query_lower):
                return QueryComplexity.SIMPLE, analysis
        
        # Very short queries are usually simple
        if word_count <= 5 and analysis["question_count"] <= 1 and not analysis["has_code"]:
            return QueryComplexity.SIMPLE, analysis
        
        # Expert level indicators
        for pattern in self.expert_patterns:
            if re.search(pattern, query_lower):
                complexity_score += 3
        
        if analysis["has_code"]:
            complexity_score += 2
        
        if analysis["technical_terms"] >= 3:
            complexity_score += 2
        
        # Complex query indicators
        if analysis["reasoning_required"]:
            complexity_score += 2
        
        if analysis["multi_step"]:
            complexity_score += 2
        
        if analysis["question_count"] >= 2:
            complexity_score += 1
        
        if word_count > 50:
            complexity_score += 1
        
        if context_length > 2000:  # Large context requires more capable models
            complexity_score += 1
        
        # Determine final complexity
        if complexity_score >= 6:
            return QueryComplexity.EXPERT, analysis
        elif complexity_score >= 3:
            return QueryComplexity.COMPLEX, analysis
        elif word_count > 20 or analysis["reasoning_required"]:
            return QueryComplexity.MODERATE, analysis
        else:
            return QueryComplexity.SIMPLE, analysis

    def detect_special_requirements(self, query: str) -> List[str]:
        """Detect special requirements like vision, code, etc."""
        requirements = []
        query_lower = query.lower()
        
        # Vision/Image requirements
        if any(word in query_lower for word in ["image", "picture", "photo", "visual", "screenshot", "diagram"]):
            requirements.append("vision")
        
        # Code requirements
        if any(indicator in query for indicator in self.code_indicators):
            requirements.append("code")
        
        # Long context requirements
        if len(query.split()) > 500:
            requirements.append("long_context")
        
        # Function calling requirements
        if any(word in query_lower for word in ["weather", "calculate", "search", "time", "current"]):
            requirements.append("function_calling")
        
        # Multilingual requirements
        if re.search(r'[^\x00-\x7F]', query):  # Non-ASCII characters
            requirements.append("multilingual")
        
        return requirements


class SmartModelRouter:
    """
    Smart model router that selects optimal model based on:
    1. Query complexity
    2. Cost optimization
    3. Special requirements
    4. User preferences
    """
    
    def __init__(self):
        self.analyzer = QueryAnalyzer()
        self.routing_history = []
        logger.info("SmartModelRouter initialized")
    
    def calculate_estimated_cost(self, model: str, input_tokens: int, output_tokens: int = 500) -> float:
        """Calculate estimated cost for a model."""
        cost_per_1m = MODEL_COSTS.get(model, 0.0)
        total_tokens = input_tokens + output_tokens
        return (total_tokens / 1_000_000) * cost_per_1m
    
    def select_model(
        self,
        query: str,
        request_type: Optional[str] = None,
        context_length: int = 0,
        user_preferences: Optional[Dict] = None,
        force_model: Optional[str] = None,
        optimize_for: str = "balanced"  # "cost", "quality", "balanced"
    ) -> Dict:
        """
        Select the optimal model for the query.
        
        Args:
            query: User's query
            request_type: Type of request (coding, reasoning, general, etc.)
            context_length: Length of conversation context
            user_preferences: User's model preferences
            force_model: Force a specific model (user override)
            optimize_for: Optimization strategy
            
        Returns:
            Dict with selected model and routing metadata
        """
        # User override takes precedence
        if force_model:
            logger.info(f"User forced model: {force_model}")
            return {
                "model": force_model,
                "request_type": request_type or "general",
                "complexity": "user_override",
                "reason": "User selected specific model",
                "estimated_cost": self.calculate_estimated_cost(force_model, len(query.split()) * 1.3),
                "routing_decision": "user_override"
            }
        
        # Analyze query
        complexity, analysis = self.analyzer.analyze_complexity(query, context_length)
        special_requirements = self.analyzer.detect_special_requirements(query)
        
        logger.info(f"Query analysis: complexity={complexity}, requirements={special_requirements}")
        
        # Get estimated token count
        estimated_input_tokens = len(query.split()) * 1.3 + context_length
        
        # Select model based on complexity and requirements
        selected_model = None
        reason = ""
        
        # Handle special requirements first
        if "vision" in special_requirements:
            selected_model = "qwen/qwen2.5-vl-72b-instruct:free"
            reason = "Vision/image processing required"
        
        elif "code" in special_requirements and request_type == "coding":
            if complexity in [QueryComplexity.EXPERT, QueryComplexity.COMPLEX]:
                selected_model = "x-ai/grok-4-fast:free"
                reason = "Complex coding task - using Grok-4 Fast"
            else:
                selected_model = "qwen/qwen3-coder"
                reason = "Coding task - using Qwen3 Coder"
        
        elif "long_context" in special_requirements:
            selected_model = "gemini-2.5-flash"
            reason = "Long context requires Gemini's large context window"
        
        elif "function_calling" in special_requirements:
            selected_model = "gemini-2.5-flash"
            reason = "Function calling requires compatible model"
        
        # Standard complexity-based routing
        else:
            if optimize_for == "cost":
                # Always use free models for cost optimization
                if complexity == QueryComplexity.SIMPLE:
                    selected_model = "openai/gpt-oss-20b:free"
                    reason = "Simple query - cost optimized"
                elif complexity == QueryComplexity.MODERATE:
                    selected_model = "llama-3.1-8b-instant"
                    reason = "Moderate query - cost optimized"
                else:
                    selected_model = "deepseek/deepseek-chat-v3.1:free"
                    reason = "Complex query - best free model"
            
            elif optimize_for == "quality":
                # Use best available models
                if request_type == "coding":
                    selected_model = "x-ai/grok-4-fast:free"
                    reason = "Quality optimized for coding"
                elif request_type == "reasoning":
                    selected_model = "deepseek/deepseek-chat-v3.1:free"
                    reason = "Quality optimized for reasoning"
                else:
                    selected_model = "gemini-2.5-flash"
                    reason = "Quality optimized - Gemini"
            
            else:  # balanced (default)
                if complexity == QueryComplexity.SIMPLE:
                    selected_model = "openai/gpt-oss-20b:free"
                    reason = "Simple query - balanced routing"
                
                elif complexity == QueryComplexity.MODERATE:
                    if request_type == "coding":
                        selected_model = "qwen/qwen3-coder"
                        reason = "Moderate coding - Qwen3 Coder"
                    else:
                        selected_model = "llama-3.1-8b-instant"
                        reason = "Moderate query - Llama 3.1"
                
                elif complexity == QueryComplexity.COMPLEX:
                    if request_type == "coding":
                        selected_model = "x-ai/grok-4-fast:free"
                        reason = "Complex coding - Grok-4"
                    elif request_type == "reasoning":
                        selected_model = "deepseek/deepseek-chat-v3.1:free"
                        reason = "Complex reasoning - DeepSeek"
                    else:
                        selected_model = "gemini-2.5-flash"
                        reason = "Complex query - Gemini"
                
                else:  # EXPERT
                    if request_type == "coding":
                        selected_model = "x-ai/grok-4-fast:free"
                        reason = "Expert coding - Grok-4"
                    else:
                        selected_model = "gemini-2.5-flash"
                        reason = "Expert level - Gemini"
        
        # Apply user preferences if any
        if user_preferences and "preferred_model" in user_preferences:
            if user_preferences.get("always_use_preferred", False):
                selected_model = user_preferences["preferred_model"]
                reason = f"User preference: {selected_model}"
        
        # Calculate estimated cost
        estimated_cost = self.calculate_estimated_cost(selected_model, estimated_input_tokens)
        
        # Create routing decision
        routing_decision = {
            "model": selected_model,
            "request_type": request_type or "general",
            "complexity": complexity.value,
            "reason": reason,
            "estimated_cost": estimated_cost,
            "special_requirements": special_requirements,
            "analysis": analysis,
            "routing_decision": "smart_router",
            "optimize_for": optimize_for,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log routing decision
        self.routing_history.append(routing_decision)
        logger.info(
            f"Smart Router Decision: {selected_model} | "
            f"Complexity: {complexity.value} | "
            f"Cost: ${estimated_cost:.6f} | "
            f"Reason: {reason}"
        )
        
        return routing_decision
    
    def get_routing_stats(self) -> Dict:
        """Get routing statistics."""
        if not self.routing_history:
            return {"total_decisions": 0}
        
        total_decisions = len(self.routing_history)
        models_used = {}
        total_cost = 0.0
        complexity_distribution = {}
        
        for decision in self.routing_history:
            # Count models
            model = decision["model"]
            models_used[model] = models_used.get(model, 0) + 1
            
            # Sum costs
            total_cost += decision.get("estimated_cost", 0.0)
            
            # Count complexity
            complexity = decision["complexity"]
            complexity_distribution[complexity] = complexity_distribution.get(complexity, 0) + 1
        
        return {
            "total_decisions": total_decisions,
            "models_used": models_used,
            "total_estimated_cost": total_cost,
            "avg_cost_per_query": total_cost / total_decisions if total_decisions > 0 else 0,
            "complexity_distribution": complexity_distribution,
            "cost_savings": self._calculate_savings(),
        }
    
    def _calculate_savings(self) -> Dict:
        """Calculate cost savings vs always using premium models."""
        if not self.routing_history:
            return {"savings": 0.0, "percentage": 0.0}
        
        actual_cost = sum(d.get("estimated_cost", 0.0) for d in self.routing_history)
        
        # Calculate what it would cost if we always used a premium model
        premium_model = "gemini-2.5-flash"
        premium_cost = 0.0
        
        for decision in self.routing_history:
            analysis = decision.get("analysis", {})
            input_tokens = analysis.get("word_count", 100) * 1.3
            premium_cost += self.calculate_estimated_cost(premium_model, input_tokens)
        
        savings = premium_cost - actual_cost
        percentage = (savings / premium_cost * 100) if premium_cost > 0 else 0
        
        return {
            "actual_cost": actual_cost,
            "premium_cost": premium_cost,
            "savings": savings,
            "percentage": percentage
        }


# Global router instance
smart_router = SmartModelRouter()
