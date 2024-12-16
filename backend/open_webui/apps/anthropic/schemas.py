from pydantic import BaseModel, Field

class ConnectionVerificationForm(BaseModel):
    """Form for verifying Anthropic API connection."""
    url: str = Field(..., description="Base URL for the Anthropic API")
    key: str = Field(..., description="API key for authentication")

class ModelNameForm(BaseModel):
    """Form for model operations."""
    name: str = Field(..., description="Name of the model")
