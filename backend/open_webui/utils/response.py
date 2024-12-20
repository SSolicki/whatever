import json
from open_webui.utils.misc import (
    openai_chat_chunk_message_template,
    openai_chat_completion_message_template,
)
import time
from typing import Union
from starlette.responses import StreamingResponse


def convert_response_ollama_to_openai(ollama_response: dict) -> dict:
    model = ollama_response.get("model", "ollama")
    message_content = ollama_response.get("message", {}).get("content", "")

    response = openai_chat_completion_message_template(model, message_content)
    return response


async def convert_streaming_response_ollama_to_openai(ollama_streaming_response):
    async for data in ollama_streaming_response.body_iterator:
        data = json.loads(data)

        model = data.get("model", "ollama")
        message_content = data.get("message", {}).get("content", "")
        done = data.get("done", False)

        data = openai_chat_chunk_message_template(
            model, message_content if not done else None
        )

        line = f"data: {json.dumps(data)}\n\n"
        yield line

    yield "data: [DONE]\n\n"


def convert_response_google_to_openai(google_response: Union[dict, StreamingResponse]) -> Union[dict, StreamingResponse]:
    """Convert a Google API response to OpenAI format."""
    # If it's a streaming response, return it directly
    if isinstance(google_response, StreamingResponse):
        return google_response

    # Otherwise process as a regular response
    model = google_response.get("model", "google")
    if "candidates" in google_response:
        message_content = google_response["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
    else:
        message_content = ""

    response = {
        "id": "chatcmpl",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": message_content,
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 0,  # We don't get this from Google
            "completion_tokens": 0,
            "total_tokens": 0
        }
    }
    return response


async def convert_streaming_response_google_to_openai(google_streaming_response):
    """Convert a streaming Google API response to OpenAI format."""
    async for chunk in google_streaming_response:
        try:
            # Skip empty lines
            if not chunk:
                continue

            # Parse the chunk data
            data = json.loads(chunk.decode('utf-8'))
            
            if "error" in data:
                error_data = {"error": data["error"]}
                yield f"data: {json.dumps(error_data)}\n\n"
                continue

            # Extract content from the chunk
            if "candidates" in data:
                candidate = data["candidates"][0]
                text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
                finish_reason = candidate.get("finishReason", None)

                # Create OpenAI-style chunk
                chunk = {
                    "id": "chatcmpl",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": "google",  # This will be overridden by the actual model ID
                    "choices": [{
                        "index": 0,
                        "delta": {
                            "content": text
                        },
                        "finish_reason": finish_reason.lower() if finish_reason else None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"

                if finish_reason:
                    yield "data: [DONE]\n\n"

        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_data = {"error": {"message": str(e), "type": "response_conversion_error"}}
            yield f"data: {json.dumps(error_data)}\n\n"
            yield "data: [DONE]\n\n"
            break
