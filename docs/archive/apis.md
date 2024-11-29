# Frontend API Client Documentation

## Overview

This document provides comprehensive guidance for developers working with the frontend API client system. The API client system is built with TypeScript and follows a modular architecture pattern.

## API Client Directory Structure

The API clients are located in `src/lib/apis/` and organized into the following modules:

- `anthropic/` - Anthropic AI API integrations
- `audio/` - Audio processing APIs
- `auths/` - Authentication related endpoints
- `chats/` - Chat functionality APIs
- `configs/` - Configuration management
- `evaluations/` - Evaluation related endpoints
- `files/` - File handling APIs
- `folders/` - Folder management
- `functions/` - Utility functions
- `images/` - Image processing APIs
- `knowledge/` - Knowledge base APIs
- `memories/` - Memory management
- `models/` - Model-related endpoints
- `ollama/` - Ollama integration
- `openai/` - OpenAI integration
- `prompts/` - Prompt management
- `retrieval/` - Data retrieval endpoints
- `streaming/` - Streaming functionality
- `tools/` - Tool-related APIs
- `users/` - User management
- `utils/` - Utility functions

## Client Implementation

### Authentication
- All API clients accept an optional `token` parameter for authentication
- Include the token in the Authorization header: `authorization: Bearer ${token}`

### Base URLs
- The API uses two base URLs defined in constants:
  - `WEBUI_API_BASE_URL`
  - `WEBUI_BASE_URL`

### Common Patterns

1. **Error Handling**
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) throw await response.json();
  return response.json();
} catch (err) {
  // Handle error appropriately
}
```

2. **Request Headers**
```typescript
{
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(token && { authorization: `Bearer ${token}` })
}
```

### API Patterns

#### Error Handling
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) throw await response.json();
  return response.json();
} catch (err) {
  // Handle error appropriately
}
```

#### Streaming Responses
The API supports streaming for real-time responses:

1. **Stream Setup**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

const reader = response.body.getReader();
```

2. **Stream Processing**
```typescript
const processStreamingResponse = async (
  reader: ReadableStreamDefaultReader,
  onChunk: (chunk: string) => void,
  onDone: () => void
) => {
  try {
    const lines = splitStream(chunk);
    for (const line of lines) {
      const content = line.replace(/^data: /, '');
      if (content === '[DONE]') {
        onDone();
        return;
      }
      
      const json = JSON.parse(content);
      if (json.message) {
        onChunk(json.message);
      }
    }
  } catch (err) {
    console.error('Error processing chunk:', err);
  }
};
```

3. **Error Cases**
- Network interruptions
- JSON parsing failures
- Stream processing errors
- Authentication failures
- Rate limiting

4. **Resource Management**
- Proper reader cleanup
- Error recovery
- Memory management
- Event handling

## Key Client Interfaces

```typescript
interface ModelConfig {
  id: string;
  name: string;
  meta: ModelMeta;
  base_model_id?: string;
  params: ModelParams;
}

interface ModelMeta {
  description?: string;
  capabilities?: object;
  profile_image_url?: string;
}

interface ChatCompletedForm {
  model: string;
  messages: string[];
  chat_id: string;
  session_id: string;
}

interface ChatActionForm {
  model: string;
  messages: string[];
  chat_id: string;
}
```

## Usage Examples

### Basic API Call
```typescript
const models = await getModels(userToken);
console.log(models);
```

### Chat Completion
```typescript
const chatResult = await chatCompleted(userToken, {
  model: "gpt-4",
  messages: ["Hello", "Hi there!"],
  chat_id: "chat123",
  session_id: "session456"
});
```

## Contributing Guidelines

### Adding New API Clients

1. Create a new file in the appropriate module directory
2. Follow the existing error handling pattern
3. Use TypeScript interfaces for request/response types
4. Include authentication handling
5. Add appropriate error handling

### Code Organization
- Keep related endpoints in the same module
- Use clear, descriptive function names
- Document complex logic with comments

### Testing
- Write unit tests for new endpoints
- Test error cases
- Verify authentication handling
