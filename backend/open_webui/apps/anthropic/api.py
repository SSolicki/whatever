from typing import Any, Dict, List, Optional, Union
import anthropic
import json
import logging
import time
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

log = logging.getLogger(__name__)

class AnthropicAPI:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.anthropic.com",
        timeout: int = 360,
    ):
        self.api_key = api_key
        self.client = anthropic.Anthropic(
            api_key=api_key,
            base_url=base_url.rstrip("/")
        )

    async def close(self):
        # No need to close the client explicitly in the new API
        pass

    async def verify_api_key(self) -> bool:
        """Verify API key by making a test request."""
        try:
            # Make a minimal request to verify the API key
            self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except Exception as e:
            log.error(f"API key verification failed: {e}")
            return False

    async def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Union[StreamingResponse, Dict[str, Any]]:
        """Create a chat completion with streaming support"""
        
        # Convert messages to Anthropic format
        system_message = next((m["content"] for m in messages if m["role"] == "system"), None)
        conversation = []
        
        for msg in messages:
            if msg["role"] not in ["system", "user", "assistant"]:
                continue
            if msg["role"] == "system":
                continue
                
            conversation.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Prepare the request parameters
        params = {
            "model": model,
            "messages": conversation,
            "stream": stream
        }

        if system_message:
            params["system"] = system_message
        if temperature is not None:
            params["temperature"] = temperature
        if max_tokens is not None:
            params["max_tokens"] = max_tokens

        try:
            if stream:
                response = self.client.messages.create(**params, stream=True)
                
                async def stream_response():
                    for chunk in response:
                        if hasattr(chunk.delta, 'text') and chunk.delta.text:
                            yield json.dumps({
                                "id": chunk.id,
                                "object": "chat.completion.chunk",
                                "created": int(time.time()),
                                "model": chunk.model,
                                "choices": [{
                                    "index": 0,
                                    "delta": {"content": chunk.delta.text},
                                    "finish_reason": chunk.stop_reason if chunk.stop_reason else None
                                }]
                            }) + "\n"

                return StreamingResponse(stream_response(), media_type="text/event-stream")
            else:
                response = self.client.messages.create(**params)
                return {
                    "id": response.id,
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": response.model,
                    "choices": [{
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": response.content[0].text if response.content else ""
                        },
                        "finish_reason": response.stop_reason
                    }]
                }
        except Exception as e:
            log.error(f"Error in chat completion: {e}")
            raise HTTPException(status_code=500, detail=str(e))
