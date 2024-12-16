import logging
from typing import Optional, Dict, List
from starlette.responses import StreamingResponse
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from aiocache import cached
import asyncio
import aiohttp
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
        
        import google.generativeai as genai
        # Configure with base URL and API key
        genai.configure(
            api_key=key,
            transport="rest",
            client_options={"api_endpoint": form_data.url.rstrip("/")}
        )
        
        # Try to list models to verify connection
        try:
            models = genai.list_models()
            return {"status": "ok"}
        except Exception as e:
            log.error(f"API key verification failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Connection verification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/audio/speech")
async def speech(request: Request, user=Depends(get_verified_user)):
    idx = None
    try:
        # Find the first Google API URL that supports text-to-speech
        for i, url in enumerate(GOOGLE_API_BASE_URLS.value):
            if "text-to-speech" in GOOGLE_API_CONFIGS.value.get(url, {}).get("capabilities", []):
                idx = i
                break
        
        if idx is None:
            raise ValueError("No Google API endpoint found with text-to-speech capability")

        body = await request.body()
        name = hashlib.sha256(body).hexdigest()

        SPEECH_CACHE_DIR = Path(CACHE_DIR).joinpath("./audio/speech/")
        SPEECH_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        file_path = SPEECH_CACHE_DIR.joinpath(f"{name}.mp3")
        file_body_path = SPEECH_CACHE_DIR.joinpath(f"{name}.json")

        # Check if the file already exists in the cache
        if file_path.is_file():
            return FileResponse(file_path)

        # Initialize Google AI client
        client = openai.Client(
            api_key=GOOGLE_API_KEYS.value[idx],
            api_type="google",
            api_version="2023-03-15",
            api_base=GOOGLE_API_BASE_URLS.value[idx]
        )

        # Parse request body
        request_data = json.loads(body)
        
        try:
            # Generate speech using Google's text-to-speech API
            response = client.generate_speech(
                model="text-to-speech",
                text=request_data.get("input"),
                voice=request_data.get("voice", "en-US-Neural2-A"),
                output_config={"audio_encoding": "MP3"}
            )

            # Save the audio content to a file
            with open(file_path, "wb") as f:
                f.write(response.audio_content)

            with open(file_body_path, "w") as f:
                json.dump(request_data, f)

            return FileResponse(file_path)

        except Exception as e:
            log.exception(e)
            error_detail = f"Google AI API Error: {str(e)}"
            raise HTTPException(status_code=500, detail=error_detail)

    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

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

async def merge_models_lists(model_lists):
    merged_models = []
    for models in model_lists:
        if models:
            for model in models:
                if model not in merged_models:
                    merged_models.append(model)
    return merged_models

async def get_all_models_responses():
    tasks = []
    for idx, url in enumerate(GOOGLE_API_BASE_URLS.value):
        key = GOOGLE_API_KEYS.value[idx]
        client = openai.Client(
            api_key=key,
            api_type="google",
            api_version="2023-03-15",
            api_base=url
        )
        try:
            models = client.list_models()
            tasks.append(models)
        except Exception as e:
            log.exception(e)
            tasks.append(None)
    return tasks

@cached(ttl=300)
async def get_all_models():
    responses = await get_all_models_responses()
    models_list = []
    
    for response in responses:
        if response:
            models = []
            for model in response:
                model_info = {
                    "id": model.name,
                    "name": model.display_name or model.name,
                    "description": model.description,
                    "capabilities": [str(cap) for cap in model.supported_generation_methods],
                    "tokens": model.input_token_limit,
                }
                models.append(model_info)
            models_list.append(models)
        else:
            models_list.append(None)
    
    return await merge_models_lists(models_list)

@app.get("/models")
async def get_models(url_idx: Optional[int] = None, user=Depends(get_verified_user)):
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED)

    if url_idx is not None:
        if url_idx >= len(GOOGLE_API_BASE_URLS.value):
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND)
        
        client = openai.Client(
            api_key=GOOGLE_API_KEYS.value[url_idx],
            api_type="google",
            api_version="2023-03-15",
            api_base=GOOGLE_API_BASE_URLS.value[url_idx]
        )
        
        try:
            models = client.list_models()
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

@app.post("/chat/completions")
async def generate_chat_completion(
    request: Request,
    user=Depends(get_verified_user),
    bypass_filter: Optional[bool] = False,
):
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED)

    body = await request.json()
    model = body.get("model", "")
    stream = body.get("stream", False)

    # Find the API URL that supports this model
    idx = None
    for i, url in enumerate(GOOGLE_API_BASE_URLS.value):
        config = GOOGLE_API_CONFIGS.value.get(url, {})
        if model in config.get("models", []):
            idx = i
            break

    if idx is None:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND)

    # Initialize Google AI client
    client = openai.Client(
        api_key=GOOGLE_API_KEYS.value[idx],
        api_type="google",
        api_version="2023-03-15",
        api_base=GOOGLE_API_BASE_URLS.value[idx]
    )

    # Apply model parameters and system prompt
    body = apply_model_params_to_body_google(body)
    body = apply_model_system_prompt_to_body(body)

    try:
        # Convert messages to Google AI format
        messages = []
        for msg in body.get("messages", []):
            if msg["role"] == "system":
                continue  # System messages are handled differently in Google AI
            content = msg["content"]
            if isinstance(content, list):
                # Handle multimodal content
                parts = []
                for part in content:
                    if isinstance(part, str):
                        parts.append(part)
                    elif isinstance(part, dict) and part.get("type") == "image":
                        parts.append(part["image_url"])
                messages.append({"role": msg["role"], "content": parts})
            else:
                messages.append({"role": msg["role"], "content": content})

        # Generate response
        if stream:
            async def generate():
                try:
                    for response in client.generate_content(
                        model=model,
                        contents=messages,
                        stream=True,
                        generation_config={
                            "temperature": body.get("temperature", 0.7),
                            "top_p": body.get("top_p", 0.95),
                            "top_k": body.get("top_k", 40),
                            "candidate_count": 1,
                            "max_output_tokens": body.get("max_tokens", 1024),
                        }
                    ):
                        chunk = {
                            "id": "chatcmpl",
                            "object": "chat.completion.chunk",
                            "created": int(response.create_time.timestamp()),
                            "model": model,
                            "choices": [{
                                "index": 0,
                                "delta": {
                                    "content": response.text,
                                },
                                "finish_reason": None
                            }]
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as e:
                    log.exception(e)
                    error_chunk = {
                        "error": {
                            "message": str(e),
                            "type": "google_api_error"
                        }
                    }
                    yield f"data: {json.dumps(error_chunk)}\n\n"

            return StreamingResponse(generate(), media_type="text/event-stream")
        else:
            response = client.generate_content(
                model=model,
                contents=messages,
                generation_config={
                    "temperature": body.get("temperature", 0.7),
                    "top_p": body.get("top_p", 0.95),
                    "top_k": body.get("top_k", 40),
                    "candidate_count": 1,
                    "max_output_tokens": body.get("max_tokens", 1024),
                }
            )

            return {
                "id": "chatcmpl",
                "object": "chat.completion",
                "created": int(response.create_time.timestamp()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response.text,
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": response.prompt_token_count,
                    "completion_tokens": response.candidates_token_count,
                    "total_tokens": response.prompt_token_count + response.candidates_token_count
                }
            }

    except Exception as e:
        log.exception(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/google/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(path: str, request: Request, user=Depends(get_verified_user)):
    if not ENABLE_GOOGLE_API.value:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_ENABLED)

    # Extract the model from the request
    body = await request.json() if request.method in ["POST", "PUT"] else {}
    model = body.get("model", "") if body else ""

    # Find the API URL that supports this model
    idx = None
    for i, url in enumerate(GOOGLE_API_BASE_URLS.value):
        config = GOOGLE_API_CONFIGS.value.get(url, {})
        if model in config.get("models", []):
            idx = i
            break

    if idx is None:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES.GOOGLE_NOT_FOUND)

    # Initialize Google AI client
    client = openai.Client(
        api_key=GOOGLE_API_KEYS.value[idx],
        api_type="google",
        api_version="2023-03-15",
        api_base=GOOGLE_API_BASE_URLS.value[idx]
    )

    try:
        # Handle the request based on the path and method
        if path == "embeddings":
            response = client.embed_content(
                model=model,
                content=body.get("input", ""),
            )
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