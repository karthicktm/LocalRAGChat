import ollama
import logging
from typing import List, Dict, Optional
import httpx

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self):
        self.base_url = "http://localhost:11434"

    async def list_models(self) -> List[Dict]:
        """Get list of available models from Ollama"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = []
                    for model in data.get("models", []):
                        models.append({
                            "id": model["name"],
                            "name": model["name"].split(":")[0].replace("-", " ").title(),
                            "size": self._format_size(model.get("size", 0)),
                            "parameters": self._extract_parameters(model["name"]),
                            "provider": self._extract_provider(model["name"]),
                            "installed": True
                        })
                    return models
                else:
                    logger.error(f"Failed to get models: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error getting models: {str(e)}")
            return []

    async def generate_response(self, model_id: str, prompt: str, context: Optional[List[str]] = None) -> Dict:
        """Generate response using Ollama model"""
        try:
            # Build context-aware prompt if context is provided
            full_prompt = prompt
            if context:
                context_str = "\n".join(context[-5:])  # Use last 5 context items

                # Enhanced prompt to better handle document-specific requests
                if any(keyword in prompt.lower() for keyword in ["only from", "specifically from", "just from", "take from", "using only"]):
                    full_prompt = f"""Using ONLY the provided context, answer the question.
If the context doesn't contain the information needed, say "The provided documents don't contain that information."

Context:
{context_str}

Question: {prompt}

Remember: Use ONLY the information from the provided context above."""
                else:
                    full_prompt = f"Context:\n{context_str}\n\nQuestion: {prompt}"

            payload = {
                "model": model_id,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for faster, more deterministic responses
                    "top_p": 0.9,
                    "max_tokens": 500,  # Limit response length for faster generation
                    "num_ctx": 2048,   # Reduce context window for better performance
                    "num_predict": 400  # Predict fewer tokens
                }
            }

            async with httpx.AsyncClient(timeout=15.0) as client:  # Reduced timeout for faster error handling
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "response": data.get("response", ""),
                        "model": model_id,
                        "context": context or []
                    }
                else:
                    logger.error(f"Failed to generate response: {response.status_code}")
                    return {"response": "Sorry, I encountered an error processing your request."}

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return {"response": "Sorry, I encountered an error processing your request."}

    async def pull_model(self, model_id: str) -> bool:
        """Pull a new model from Ollama"""
        try:
            payload = {"name": model_id}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(f"{self.base_url}/api/pull", json=payload)
                if response.status_code == 200:
                    logger.info(f"Successfully started pulling model: {model_id}")
                    return True
                else:
                    logger.error(f"Failed to pull model {model_id}: {response.status_code}")
                    return False
        except Exception as e:
            logger.error(f"Error pulling model {model_id}: {str(e)}")
            return False

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "Unknown"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    def _extract_parameters(self, model_name: str) -> str:
        """Extract parameter count from model name"""
        if ":3b" in model_name.lower():
            return "3B"
        elif ":2b" in model_name.lower():
            return "2B"
        elif ":7b" in model_name.lower() or "70b" in model_name.lower():
            return "7B"
        elif ":1b" in model_name.lower():
            return "1B"
        else:
            return "Unknown"

    def _extract_provider(self, model_name: str) -> str:
        """Extract provider from model name"""
        model_lower = model_name.lower()
        if "llama" in model_lower:
            return "Meta"
        elif "gemma" in model_lower:
            return "Google"
        elif "phi" in model_lower:
            return "Microsoft"
        elif "qwen" in model_lower:
            return "Alibaba"
        elif "mistral" in model_lower:
            return "Mistral AI"
        else:
            return "Unknown"

# Recommended models for installation
RECOMMENDED_MODELS = [
    {"id": "llama3.2:3b", "name": "Llama 3.2 3B", "parameters": "3B", "provider": "Meta"},
    {"id": "gemma2:2b", "name": "Gemma 2 2B", "parameters": "2B", "provider": "Google"},
    {"id": "phi3:mini", "name": "Phi 3 Mini", "parameters": "3.8B", "provider": "Microsoft"},
    {"id": "qwen2.5:3b", "name": "Qwen2.5 3B", "parameters": "3B", "provider": "Alibaba"},
    {"id": "mistral:7b", "name": "Mistral 7B", "parameters": "7B", "provider": "Mistral AI"}
]