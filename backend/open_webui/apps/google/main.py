import json
import logging
import time
from operator import ge
from typing import Optional, Dict, List
from starlette.responses import StreamingResponse
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from aiocache import cached
import asyncio
import aiohttp
import google.generativeai as genai
from open_webui.apps.webui.models.models import Models
from open_webui.config import (
    CACHE_DIR,
    CORS_ALLOW_ORIGIN,
    ENABLE_GOOGLE_API,
    GOOGLE_API_BASE_URLS,
    GOOGLE_API_KEYS,
    GOOGLE_API_CONFIGS,
    AppConfig,
)
from open_webui.env import (
    AIOHTTP_CLIENT_TIMEOUT,
    AIOHTTP_CLIENT_TIMEOUT_OPENAI_MODEL_LIST as AIOHTTP_CLIENT_TIMEOUT_GOOGLE_MODEL_LIST,
    ENABLE_FORWARD_USER_INFO_HEADERS,
)

from open_webui.constants import ERROR_MESSAGES
from open_webui.env import ENV, SRC_LOG_LEVELS
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask

from open_webui.utils.payload import (
    apply_model_params_to_body_google,
    apply_model_system_prompt_to_body,
)

from open_webui.utils.utils import get_admin_user, get_verified_user
from open_webui.utils.access_control import has_access

from enum import Enum

class ERROR_MESSAGES(str, Enum):
    GOOGLE_NOT_ENABLED = "Google API is not enabled"
    GOOGLE_NOT_FOUND = "No Google API URL found that supports this model"
    GOOGLE_INVALID_REQUEST = "Invalid request format"
    GOOGLE_API_ERROR = "Error from Google API"

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["GOOGLE"])

app = FastAPI(
    docs_url="/docs" if ENV == "dev" else None,
    openapi_url="/openapi.json" if ENV == "dev" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/config")
async def get_config(user=Depends(get_admin_user)):
    return {
        "ENABLE_GOOGLE_API": ENABLE_GOOGLE_API.value,
        "GOOGLE_API_BASE_URLS": GOOGLE_API_BASE_URLS.value,
        "GOOGLE_API_KEYS": GOOGLE_API_KEYS.value,
        "GOOGLE_API_CONFIGS": GOOGLE_API_CONFIGS.value,
    }

class GoogleConfigForm(BaseModel):
    ENABLE_GOOGLE_API: Optional[bool] = None
    GOOGLE_API_BASE_URLS: list[str]
    GOOGLE_API_KEYS: list[str]
    GOOGLE_API_CONFIGS: dict

@app.post("/config/update")
async def update_config(form_data: GoogleConfigForm, user=Depends(get_admin_user)):
    if form_data.ENABLE_GOOGLE_API is not None:
        ENABLE_GOOGLE_API.value = form_data.ENABLE_GOOGLE_API
        ENABLE_GOOGLE_API.save()

    GOOGLE_API_BASE_URLS.value = form_data.GOOGLE_API_BASE_URLS
    GOOGLE_API_BASE_URLS.save()

    GOOGLE_API_KEYS.value = form_data.GOOGLE_API_KEYS
    GOOGLE_API_KEYS.save()

    # Check if API KEYS length matches API URLS length
    if len(GOOGLE_API_KEYS.value) != len(GOOGLE_API_BASE_URLS.value):
        if len(GOOGLE_API_KEYS.value) > len(GOOGLE_API_BASE_URLS.value):
            GOOGLE_API_KEYS.value = GOOGLE_API_KEYS.value[: len(GOOGLE_API_BASE_URLS.value)]
        else:
            GOOGLE_API_KEYS.value += [""] * (
                len(GOOGLE_API_BASE_URLS.value) - len(GOOGLE_API_KEYS.value)
            )
        GOOGLE_API_KEYS.save()

    GOOGLE_API_CONFIGS.value = form_data.GOOGLE_API_CONFIGS
    GOOGLE_API_CONFIGS.save()

    return await get_config(user)

class ConnectionVerificationForm(BaseModel):
    url: str
    key: Optional[str] = None

async def google_http_get(url: str, key: str = None):
    """Make HTTP GET request to Google API."""
    timeout = aiohttp.ClientTimeout(total=AIOHTTP_CLIENT_TIMEOUT_GOOGLE_MODEL_LIST)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        # Google requires the API key as a query parameter
        if "?" in url:
            url = f"{url}&key={key}" if key else url
        else:
            url = f"{url}?key={key}" if key else url
            
        headers = {
            "Content-Type": "application/json"
        }
        
        try:
            log.debug(f"Making request to Google API: {url}")
            async with session.get(url, headers=headers) as response:
                response_text = await response.text()
                log.debug(f"Google API response: {response.status} - {response_text}")
                
                if response.status == 200:
                    return await response.json()
                    
                try:
                    error_json = json.loads(response_text)
                    error_message = error_json.get("error", {}).get("message", response_text)
                except json.JSONDecodeError:
                    error_message = response_text
                    
                log.error(f"Google API error ({response.status}): {error_message}")
                return None
        except Exception as e:
            log.error(f"Error in Google request: {str(e)}")
            return None

@app.post("/verify", response_model=dict)
async def verify_connection(form_data: ConnectionVerificationForm, user=Depends(get_admin_user)):
    """Verify connection to Google API."""
    if not form_data.url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    try:
        # Use the provided key or fall back to the first configured key
        key = form_data.key or GOOGLE_API_KEYS.value[0]
        if not key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Ensure URL ends with /v1beta and remove any trailing slashes
        base_url = form_data.url.rstrip("/")
        if not base_url.endswith("/v1beta"):
            base_url = f"{base_url}/v1beta"
            
        # Try to list models to verify connection
        url = f"{base_url}/models"
        log.debug(f"Verifying connection to Google API: {url}")
        response = await google_http_get(url, key)
        
        if response is None:
            raise HTTPException(status_code=400, detail="Failed to connect to Google API")
            
        # Google's model list response contains 'models' array
        if not isinstance(response, dict) or "models" not in response:
            log.error(f"Invalid response format from Google API: {response}")
            raise HTTPException(status_code=400, detail="Invalid response format from Google API")
            
        return {"status": "ok", "models_count": len(response["models"])}
            
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Connection verification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def aiohttp_get(url, key=None):
    timeout = aiohttp.ClientTimeout(total=AIOHTTP_CLIENT_TIMEOUT)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {}
            if key:
                headers["Authorization"] = f"Bearer {key}"
            async with session.get(url, headers=headers) as response:
                return response, session
    except Exception as e:
        log.exception(e)
        return None, None

async def cleanup_response(
    response: Optional[aiohttp.ClientResponse],
    session: Optional[aiohttp.ClientSession],
):
    if response is not None:
        await response.release()
    if session is not None:
        await session.close()

def merge_models_lists(model_lists):
    """Merge multiple model lists into a single list, following OpenAI's pattern"""
    log.debug(f"merge_models_lists {model_lists}")
    merged_list = []

    for idx, models in enumerate(model_lists):
        if models is not None and "error" not in models:
            # Handle both list and dict responses
            model_list = models if isinstance(models, list) else models.get("models", [])
            
            for model in model_list:
                if not model.get("name", "").startswith("models/gemini-"):  # Only include Gemini models
                    continue
                    
                model_id = model.get("name", "").split("/")[-1]  # Extract name from "models/gemini-pro"
                merged_list.append({
                    "id": model_id,  # Match OpenAI's structure exactly
                    "name": model_id,
                    "owned_by": "google",
                    "google": {"id": model_id},  # Match OpenAI's nested structure
                    "urlIdx": idx
                })

    return merged_list

async def get_all_models_responses() -> list:
    """Get list of available models from Google AI, matching OpenAI's pattern"""
    if not ENABLE_GOOGLE_API.value:
        return []

    # Match API keys length to URLs length
    num_urls = len(GOOGLE_API_BASE_URLS.value)
    num_keys = len(GOOGLE_API_KEYS.value)

    if num_keys != num_urls:
        if num_keys > num_urls:
            GOOGLE_API_KEYS.value = GOOGLE_API_KEYS.value[:num_urls]
        else:
            GOOGLE_API_KEYS.value += [""] * (num_urls - num_keys)

    tasks = []
    for idx, url in enumerate(GOOGLE_API_BASE_URLS.value):
        if url not in GOOGLE_API_CONFIGS.value:
            # Standard API request
            base_url = url.rstrip("/")
            if not base_url.endswith("/v1beta"):
                base_url = f"{base_url}/v1beta"
            tasks.append(asyncio.create_task(google_http_get(f"{base_url}/models", GOOGLE_API_KEYS.value[idx])))
        else:
            # Handle custom API configurations
            api_config = GOOGLE_API_CONFIGS.value.get(url, {})
            enable = api_config.get("enable", True)
            model_ids = api_config.get("model_ids", [])

            if enable:
                if len(model_ids) == 0:
                    # No specific models configured, get all models
                    base_url = url.rstrip("/")
                    if not base_url.endswith("/v1beta"):
                        base_url = f"{base_url}/v1beta"
                    tasks.append(asyncio.create_task(google_http_get(f"{base_url}/models", GOOGLE_API_KEYS.value[idx])))
                else:
                    # Use configured model list
                    model_list = [
                        {
                            "id": model_id.split("/")[-1] if "/" in model_id else model_id,
                            "name": model_id.split("/")[-1] if "/" in model_id else model_id,
                            "owned_by": "google",
                            "google": {"id": model_id},
                            "urlIdx": idx
                        }
                        for model_id in model_ids
                    ]
                    tasks.append(asyncio.create_task(asyncio.sleep(0, {"models": model_list})))
            else:
                tasks.append(asyncio.create_task(asyncio.sleep(0, None)))

    responses = await asyncio.gather(*tasks)

    # Update GOOGLE_API_CONFIGS with discovered models
    for idx, response in enumerate(responses):
        if response and isinstance(response, dict) and "models" in response:
            url = GOOGLE_API_BASE_URLS.value[idx]
            model_list = [model["name"] for model in response["models"]]
            if url not in GOOGLE_API_CONFIGS.value:
                GOOGLE_API_CONFIGS.value[url] = {}
            GOOGLE_API_CONFIGS.value[url]["models"] = model_list
            GOOGLE_API_CONFIGS.save()

    # Handle model ID prefixes
    for idx, response in enumerate(responses):
        if response:
            url = GOOGLE_API_BASE_URLS.value[idx]
            api_config = GOOGLE_API_CONFIGS.value.get(url, {})
            prefix_id = api_config.get("prefix_id", None)

            if prefix_id:
                model_list = response if isinstance(response, list) else response.get("models", [])
                for model in model_list:
                    model["name"] = f"{prefix_id}.{model['name']}"

    log.debug(f"get_all_models_responses() {responses}")
    return responses

@cached(ttl=3)
async def get_all_models() -> dict[str, list]:
    """Get all models with caching, matching OpenAI's pattern"""
    log.info("get_all_models()")

    if not ENABLE_GOOGLE_API.value:
        return {"data": []}

    responses = await get_all_models_responses()

    def extract_data(response):
        if response and isinstance(response, dict) and "models" in response:
            return response["models"]
        if isinstance(response, list):
            return response
        return []

    models = {"data": merge_models_lists(map(extract_data, responses))}
    log.debug(f"models: {models}")

    return models

@app.get("/models")
async def get_models(url_idx: Optional[int] = None, user=Depends(get_verified_user)):
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED.value)

    if url_idx is not None:
        if url_idx >= len(GOOGLE_API_BASE_URLS.value):
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)
        
        idx = url_idx
        genai.configure(api_key=GOOGLE_API_KEYS.value[idx])
        
        try:
            models = genai.list_models()
            models_list = []
            for model in models:
                model_info = {
                    "id": model.name,
                    "name": model.display_name or model.name,
                    "description": model.description,
                    "capabilities": [str(cap) for cap in model.supported_generation_methods],
                    "tokens": model.input_token_limit,
                }
                models_list.append(model_info)
            return models_list
        except Exception as e:
            log.exception(e)
            raise HTTPException(status_code=500, detail=str(e))
    else:
        return await get_all_models()

async def get_google_url(url_idx: Optional[int] = None, model_id: Optional[str] = None, stream: bool = False):
    """Get Google API URL with proper configuration.
    
    Args:
        url_idx: Optional index into GOOGLE_API_BASE_URLS
        model_id: Model ID to use
        stream: Whether to use streaming endpoint
    
    Returns:
        Tuple of (base_url, api_key, model_id)
    """
    log.info(f"get_google_url called with url_idx={url_idx}, model_id={model_id}, stream={stream}")
    
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED.value)
        
    if url_idx is not None and url_idx >= len(GOOGLE_API_BASE_URLS.value):
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)
    
    # Strip "models/" prefix if present
    model_id_clean = model_id.replace("models/", "") if model_id and model_id.startswith("models/") else model_id
    
    # Find URL index if not provided
    if url_idx is None:
        for i, url in enumerate(GOOGLE_API_BASE_URLS.value):
            config = GOOGLE_API_CONFIGS.value.get(url, {})
            model_ids = config.get("model_ids", [])
            
            # Check both with and without "models/" prefix
            if model_id_clean in model_ids or f"models/{model_id_clean}" in model_ids or (prefix_id and model_id_clean.startswith(f"{prefix_id}.")):
                url_idx = i
                if prefix_id and model_id_clean.startswith(f"{prefix_id}."):
                    model_id_clean = model_id_clean[len(prefix_id)+1:]
                break
    
    if url_idx is None:
        log.error(f"Model {model_id_clean} not found in any config")
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)
    
    # Get base URL and verify model support
    base_url = GOOGLE_API_BASE_URLS.value[url_idx]
    config = GOOGLE_API_CONFIGS.value.get(base_url, {})
    model_ids = config.get("model_ids", [])
    
    # Check both with and without "models/" prefix
    if model_id_clean not in model_ids and f"models/{model_id_clean}" not in model_ids:
        log.error(f"Model {model_id_clean} not found in config for URL {base_url}")
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)
    
    # Construct final URL with proper endpoint
    endpoint = "streamGenerateContent" if stream else "generateContent"
    key = GOOGLE_API_KEYS.value[url_idx]
    
    if key:
        base_url = f"{base_url}/v1beta/models/{model_id_clean}:{endpoint}"
        if stream:
            base_url += f"?alt=sse&key={key}"
        else:
            base_url += f"?key={key}"
    else:
        base_url = f"{base_url}/v1beta/models/{model_id_clean}:{endpoint}"
            
    return base_url, key, model_id_clean

@app.post("/chat/completions")
async def generate_chat_completion(
    form_data: dict,
    url_idx: Optional[int] = None,
    user=Depends(get_verified_user),
    bypass_filter: Optional[bool] = False,
):
    """Generate a chat completion using Google's API."""
    try:
        model_id = form_data.get("model")
        if not model_id:
            raise HTTPException(status_code=400, detail="Model ID is required")

        log.info(f"Model ID: {model_id}")
        
        # Get the API key for the appropriate URL index
        if url_idx is None:
            url_idx = 0  # Default to the first URL if not specified
        if url_idx >= len(GOOGLE_API_KEYS.value):
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)
        
        genai.configure(api_key=GOOGLE_API_KEYS.value[url_idx])
        
        # Get the model
        model = genai.GenerativeModel(model_id)
        
        # Transform messages to Google format and get the last user message
        messages = form_data.get("messages", [])
        log.info(f"Received messages: {messages}")
        
        if not messages:
            messages = [{"role": "user", "parts": [{"text": form_data.get("prompt", "")}]}]
            log.info(f"Using prompt as message: {messages}")
        
        google_messages = []
        last_user_message = None
        
        for msg in messages:
            if msg["role"] == "user":
                google_messages.append({
                    "role": "user",
                    "parts": [{"text": part["text"]} for part in msg.get("parts", [])]
                })
                last_user_message = "".join([part["text"] for part in msg.get("parts", [])])
            elif msg["role"] == "assistant":
                google_messages.append({
                    "role": "model",
                    "parts": [{"text": part["text"]} for part in msg.get("parts", [])]
                })
            elif msg["role"] == "system":
                google_messages.append({
                    "role": "user",
                    "parts": [{"text": part["text"]} for part in msg.get("parts", [])]
                })
        
        log.info(f"Last user message: {last_user_message}")
        log.info(f"Google messages: {google_messages}")
        
        if not last_user_message:
            raise ValueError("No user message found in the conversation")

        # Get generation config
        generation_config = {}
        if "temperature" in form_data:
            generation_config["temperature"] = form_data["temperature"]
        if "top_p" in form_data:
            generation_config["top_p"] = form_data["top_p"]
        if "max_tokens" in form_data:
            generation_config["max_output_tokens"] = form_data["max_tokens"]
        
        # Generate response
        chat = model.start_chat(history=google_messages[:-1] if google_messages else [])
        response = chat.send_message(
            last_user_message,  # Just send the string directly
            generation_config=generation_config,
            stream=form_data.get("stream", True)
        )
        
        if form_data.get("stream", True):
            async def generate():
                for chunk in response:
                    chunk_data = {
                        'id': 'chatcmpl',
                        'object': 'chat.completion.chunk',
                        'created': int(time.time()),
                        'model': model_id,
                        'choices': [{
                            'index': 0,
                            'delta': {
                                'role': 'assistant',
                                'content': chunk.text
                            },
                            'finish_reason': None
                        }]
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Send the final chunk
                final_chunk = {
                    'id': 'chatcmpl',
                    'object': 'chat.completion.chunk',
                    'created': int(time.time()),
                    'model': model_id,
                    'choices': [{
                        'index': 0,
                        'delta': {},
                        'finish_reason': 'stop'
                    }]
                }
                yield f"data: {json.dumps(final_chunk)}\n\n"
                yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
        
        return {
            'id': 'chatcmpl',
            'object': 'chat.completion',
            'created': int(time.time()),
            'model': model_id,
            'choices': [{
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': response.text
                },
                'finish_reason': 'stop'
            }],
            'usage': {
                'prompt_tokens': response.prompt_token_count,
                'completion_tokens': response.candidates_token_count,
                'total_tokens': response.total_token_count
            }
        }

    except Exception as e:
        log.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.api_route("/google/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(path: str, request: Request, user=Depends(get_verified_user)):
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED.value)

    # Extract the model from the request
    body = await request.json() if request.method in ["POST", "PUT"] else {}
    model = body.get("model", "") if body else ""

    # Find the API URL that supports this model
    idx = None
    model_id_to_find = model  # Get the model ID from the payload
    
    for i, url in enumerate(GOOGLE_API_BASE_URLS.value):
        config = GOOGLE_API_CONFIGS.value.get(url, {})
        model_ids = config.get("model_ids", [])
        
        # Check if the model ID matches exactly or if it's a prefixed version
        prefix_id = config.get("prefix_id", "")
        if model_id_to_find in model_ids or (prefix_id and model_id_to_find.startswith(f"{prefix_id}.")):
            if prefix_id and model_id_to_find.startswith(f"{prefix_id}."):
                # Strip the prefix for the actual API call
                model = model_id_to_find[len(prefix_id)+1:]
            idx = i
            break

    if idx is None:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND.value)

    # Initialize Google AI client
    genai.configure(api_key=GOOGLE_API_KEYS.value[idx])

    try:
        # Handle the request based on the path and method
        if path == "embeddings":
            model = genai.GenerativeModel(model)
            response = model.embed_content(body.get("input", ""))
            return {
                "object": "list",
                "data": [{
                    "object": "embedding",
                    "embedding": response.embedding,
                    "index": 0
                }],
                "model": model,
                "usage": {
                    "prompt_tokens": response.token_count,
                    "total_tokens": response.token_count
                }
            }
        else:
            # For unhandled endpoints, return an error
            raise HTTPException(
                status_code=404,
                detail=f"Endpoint /{path} not implemented for Google AI API"
            )

    except Exception as e:
        log.exception(e)
        raise HTTPException(status_code=500, detail=str(e))