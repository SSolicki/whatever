# Anthropic Integration Technical Details

## Configuration Management

### Environment Variables
- `ENABLE_ANTHROPIC_API`: Boolean to enable/disable the Anthropic API integration (default: "False")
- `ANTHROPIC_API_BASE_URLS`: Comma-separated list of base URLs for API requests (default: "https://api.anthropic.com")
- `ANTHROPIC_API_KEYS`: Comma-separated list of API keys for authentication
- `ANTHROPIC_API_CONFIGS`: JSON object for additional configuration options (default: {})

### Configuration Storage
The configuration is managed through the `PersistentConfig` system, which:
- Stores settings in the database
- Provides environment variable fallbacks
- Allows runtime updates through the API
- Maintains configuration persistence across restarts

### Configuration Endpoints

1. `GET /config`
   - Returns current Anthropic API configuration
   - Requires admin user authentication
   - Response format:
   ```json
   {
       "ENABLE_ANTHROPIC_API": boolean,
       "ANTHROPIC_API_BASE_URLS": string[],
       "ANTHROPIC_API_KEYS": string[],
       "ANTHROPIC_API_CONFIGS": object,
       "ANTHROPIC_MODELS": object[]
   }
   ```

2. `POST /config/update`
   - Updates Anthropic API configuration
   - Requires admin user authentication
   - Request body format matches the GET response format
   - Updates are persisted to the database

## API Implementation

### Core Endpoints

1. Connection Verification (`POST /verify`)
   - Validates API credentials
   - Tests connection to Anthropic API
   - Returns connection status and any error messages

2. Model Management (`GET /models`)
   - Returns configured Claude models
   - Requires Anthropic API to be enabled
   - Returns model details including capabilities and limitations

3. Chat Completion (`POST /chat/completions`)
   - Handles chat completion requests
   - Supports streaming responses
   - Implements message history management
   - Maps OpenAI-style requests to Anthropic format

### Message Format

#### Chat Request Format
```json
{
    "messages": [
        {
            "role": "user",
            "content": "Hello, how are you?"
        }
    ],
    "model": "claude-3-opus-20240229",
    "stream": false
}
```

#### Chat Response Format
```json
{
    "id": "msg_123",
    "model": "claude-3-opus-20240229",
    "role": "assistant",
    "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
}
```

### Error Handling

1. API Response Errors
   - Connection timeouts
   - Authentication failures
   - Rate limiting
   - Invalid requests

2. Configuration Errors
   - Invalid API keys
   - Missing required configuration
   - Invalid model specifications

3. Streaming Response Management
   - Proper cleanup of resources
   - Error handling during streaming
   - Connection termination handling

## Dependencies

Required Python packages:
- `anthropic`: Official Anthropic Python client
- `fastapi`: Web framework
- `pydantic`: Data validation
- `sqlalchemy`: Database ORM for configuration storage

## Model Configuration

The default Claude model configuration:
```json
{
    "id": "claude-3-opus-20240229",
    "name": "Claude 3 Opus",
    "owned_by": "anthropic",
    "tokens_per_message": 200000,
    "tokens_per_request": 4096,
    "max_tokens": 4096
}
```

## Integration with Open WebUI

The Anthropic integration follows the same patterns as other model providers (OpenAI, Ollama) in Open WebUI:
- Consistent configuration management through `PersistentConfig`
- Similar API endpoint structure
- Shared authentication and access control
- Compatible response formats
