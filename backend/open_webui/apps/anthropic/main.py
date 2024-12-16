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
    ENABLE_ANTHROPIC_API,
    ANTHROPIC_API_BASE_URLS,
    ANTHROPIC_API_KEYS,
    ANTHROPIC_API_CONFIGS,
    ANTHROPIC_MODELS,
)
from open_webui.env import ENV, SRC_LOG_LEVELS
from open_webui.utils.utils import get_admin_user, get_verified_user
from open_webui.utils.access_control import has_access
from open_webui.apps.anthropic.api import AnthropicAPI

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["ANTHROPIC"])

app = FastAPI(
    docs_url="/docs" if ENV == "dev" else None,
    redoc_url="/redoc" if ENV == "dev" else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/config")
async def get_config(user=Depends(get_admin_user)):
    return {
        "ENABLE_ANTHROPIC_API": ENABLE_ANTHROPIC_API.value,
        "ANTHROPIC_API_BASE_URLS": ANTHROPIC_API_BASE_URLS.value,
        "ANTHROPIC_API_KEYS": ANTHROPIC_API_KEYS.value,
        "ANTHROPIC_API_CONFIGS": ANTHROPIC_API_CONFIGS.value,
        "ANTHROPIC_MODELS": ANTHROPIC_MODELS.value,
    }

class AnthropicConfigForm(BaseModel):
    ENABLE_ANTHROPIC_API: Optional[bool] = None
    ANTHROPIC_API_BASE_URLS: list[str]
    ANTHROPIC_API_KEYS: list[str]
    ANTHROPIC_API_CONFIGS: dict
    ANTHROPIC_MODELS: list[dict]

@app.post("/config/update")
async def update_config(form_data: AnthropicConfigForm, user=Depends(get_admin_user)):
    if form_data.ENABLE_ANTHROPIC_API is not None:
        ENABLE_ANTHROPIC_API.value = form_data.ENABLE_ANTHROPIC_API
        ENABLE_ANTHROPIC_API.save()

    ANTHROPIC_API_BASE_URLS.value = form_data.ANTHROPIC_API_BASE_URLS
    ANTHROPIC_API_BASE_URLS.save()

    ANTHROPIC_API_KEYS.value = form_data.ANTHROPIC_API_KEYS
    ANTHROPIC_API_KEYS.save()

    ANTHROPIC_API_CONFIGS.value = form_data.ANTHROPIC_API_CONFIGS
    ANTHROPIC_API_CONFIGS.save()

    ANTHROPIC_MODELS.value = form_data.ANTHROPIC_MODELS
    ANTHROPIC_MODELS.save()

    return await get_config(user)

class ConnectionVerificationForm(BaseModel):
    url: str
    key: Optional[str] = None

@app.post("/verify")
async def verify_connection(form_data: ConnectionVerificationForm, user=Depends(get_admin_user)):
    """Verify connection to Anthropic API."""
    try:
        api = AnthropicAPI(api_key=form_data.key or ANTHROPIC_API_KEYS.value[0])
        await api.verify_api_key()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def merge_models_lists(model_lists):
    """Merge multiple model lists into a single list with urls field."""
    merged_models = {}

    for idx, model_list in enumerate(model_lists):
        if model_list is not None:
            for model in model_list:
                id = model["id"]
                if id not in merged_models:
                    model["urls"] = [idx]
                    merged_models[id] = model
                else:
                    merged_models[id]["urls"].append(idx)

    return list(merged_models.values())

@cached(ttl=3)
async def get_all_models() -> Dict[str, List[Dict]]:
    """Get all available Anthropic models."""
    log.info("get_all_models()")
    if not ENABLE_ANTHROPIC_API.value:
        return {"models": []}

    try:
        models_with_urls = []
        for url in ANTHROPIC_API_BASE_URLS.value:
            if url in ANTHROPIC_API_CONFIGS.value:
                api_config = ANTHROPIC_API_CONFIGS.value.get(url, {})
                if not api_config.get("enable", True):
                    continue
            
            for model in ANTHROPIC_MODELS.value:
                model_copy = model.copy()
                model_copy["url"] = url
                models_with_urls.append(model_copy)

        return {"models": models_with_urls}
    except Exception as e:
        log.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_models(user=Depends(get_verified_user)) -> Dict[str, List[Dict]]:
    """Get all available Anthropic models."""
    if not ENABLE_ANTHROPIC_API.value:
        raise HTTPException(status_code=400, detail="Anthropic API is not enabled")

    return await get_all_models()

class ChatCompletionForm(BaseModel):
    messages: list[dict]
    model: str
    stream: Optional[bool] = False
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

@app.post("/chat/completions")
async def generate_chat_completion(
    request: Request,
    user=Depends(get_verified_user),
) -> StreamingResponse:
    """Generate chat completion using Anthropic API."""
    if not ENABLE_ANTHROPIC_API.value:
        raise HTTPException(status_code=400, detail="Anthropic API is not enabled")

    try:
        form_data = await request.json()
        model_id = form_data.get("model", "claude-3-opus-20240229")
        model = next((model for model in ANTHROPIC_MODELS.value if model["id"] == model_id), None)

        if model is None:
            raise HTTPException(status_code=400, detail="Model not found")

        url_idx = model.get("urls", [])[0]
        url = ANTHROPIC_API_BASE_URLS.value[url_idx]
        api_key = ANTHROPIC_API_KEYS.value[url_idx]

        api = AnthropicAPI(api_key=api_key, base_url=url)

        return await api.create_chat_completion(
            messages=form_data.get("messages", []),
            model=model_id,
            stream=form_data.get("stream", False),
            temperature=form_data.get("temperature"),
            max_tokens=form_data.get("max_tokens")
        )
    except Exception as e:
        log.error(f"Error generating chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))
