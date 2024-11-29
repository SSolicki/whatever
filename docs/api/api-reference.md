# API Reference
_Version: 1.2.0_
_Last Updated: 2024-02-22_

## Overview
This document provides a comprehensive reference for all APIs and real-time features of our application.

## Authentication

### Endpoints

#### Login
```typescript
POST /api/v1/auth/login
Content-Type: application/json

Request:
interface AuthRequest {
    username: string;
    password: string;
}

Response:
interface AuthResponse {
    token: string;    // JWT token
    user: UserInfo;   // User information
}

interface UserInfo {
    id: string;
    username: string;
    scope: string[];  // User permissions
}

Error Responses:
401 Unauthorized: Invalid credentials
400 Bad Request: Invalid input format
429 Too Many Requests: Rate limit exceeded
```

#### Refresh Token
```typescript
POST /api/v1/auth/refresh
Content-Type: application/json

Request:
interface RefreshRequest {
    refreshToken: string;
}

Response:
interface RefreshResponse {
    token: string;
    refreshToken: string;
}

Error Responses:
401 Unauthorized: Invalid refresh token
429 Too Many Requests: Rate limit exceeded
```

For detailed authentication flows and JWT implementation details, see [authentication.md](./authentication.md).

## Chat API

### Authentication
All chat endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Rate Limiting
- 100 requests per minute per user for regular endpoints
- 1000 messages per day per user for chat endpoints
- Rate limit headers included in responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1613589427
  ```

### Endpoints

#### Initialize Chat
```typescript
POST /api/v1/chat/init
Content-Type: application/json

Request:
interface ChatInitRequest {
    model: string;          // AI model identifier
    settings?: ChatSettings;
}

interface ChatSettings {
    temperature?: number;   // Default: 0.7
    maxTokens?: number;    // Default: 1000
    stream?: boolean;      // Default: true
    topP?: number;         // Default: 1.0
    presencePenalty?: number; // Default: 0.0
    frequencyPenalty?: number; // Default: 0.0
}

Response:
interface ChatInitResponse {
    chatId: string;
    settings: ChatSettings;
}

Error Responses:
400 Bad Request: Invalid settings
401 Unauthorized: Invalid token
403 Forbidden: Insufficient permissions
429 Too Many Requests: Rate limit exceeded
```

#### Start Chat
```typescript
POST /api/v1/chat/[chatId]/start
Content-Type: application/json

Request:
interface ChatStartRequest {
    message: string;
    parentMessageId?: string;
    files?: Array<FileAttachment>;
}

interface FileAttachment {
    type: string;          // MIME type
    url: string;           // File URL
    name?: string;         // Original filename
    size?: number;         // File size in bytes
    metadata?: {           // Optional metadata
        width?: number;    // Image width if applicable
        height?: number;   // Image height if applicable
        duration?: number; // Audio/video duration if applicable
    };
}

Response: EventStream
Content-Type: text/event-stream

See [streaming.md](../technical/streaming.md) for detailed stream handling implementation.

Error Responses:
400 Bad Request: Invalid message format
401 Unauthorized: Invalid token
403 Forbidden: Chat access denied
404 Not Found: Chat not found
429 Too Many Requests: Rate limit exceeded
```

#### Upload File
```typescript
POST /api/v1/chat/upload
Content-Type: multipart/form-data

Request:
interface UploadRequest {
    file: File;            // File to upload
    type: string;          // MIME type
    metadata?: {           // Optional metadata
        filename?: string; // Original filename
        purpose?: string;  // File purpose
    };
}

Response:
interface UploadResponse {
    url: string;           // File URL
    type: string;          // MIME type
    name: string;          // Original filename
    size: number;          // File size in bytes
    metadata?: {           // Optional metadata
        width?: number;    // Image width if applicable
        height?: number;   // Image height if applicable
        duration?: number; // Audio/video duration if applicable
    };
}

Error Responses:
400 Bad Request: Invalid file
401 Unauthorized: Invalid token
413 Payload Too Large: File too large
415 Unsupported Media Type: File type not supported
429 Too Many Requests: Rate limit exceeded
```

#### Get Chat History
```typescript
GET /api/v1/chat/[chatId]/history
Accept: application/json

Query Parameters:
limit?: number;    // Max messages to return (default: 50)
before?: string;   // Get messages before this ID
after?: string;    // Get messages after this ID

Response:
interface ChatHistoryResponse {
    messages: Message[];
    settings: ChatSettings;
    hasMore: boolean;      // More messages available
    nextCursor?: string;   // Cursor for pagination
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    parentId: string | null;
    createdAt: string;     // ISO timestamp
    updatedAt: string;     // ISO timestamp
    metadata?: {
        files?: FileAttachment[];
        model?: string;
        tokens?: number;
    };
}

Error Responses:
401 Unauthorized: Invalid token
403 Forbidden: Chat access denied
404 Not Found: Chat not found
429 Too Many Requests: Rate limit exceeded
```

### WebSocket Events

#### Connection
```typescript
// Connect to WebSocket
const ws = new WebSocket('wss://api.example.com/ws');

// Connection payload
interface WSAuthPayload {
    token: string;         // JWT token
}

// Connection response
interface WSConnectResponse {
    type: 'connect';
    userId: string;
    settings: UserSettings;
}
```

#### Chat Events
```typescript
// Message chunk event
interface WSMessageChunk {
    type: 'chunk';
    chatId: string;
    messageId: string;
    content: string;
    done: boolean;
    error?: ErrorInfo;
}

// Presence event
interface WSPresenceEvent {
    type: 'presence';
    chatId: string;
    users: Array<{
        id: string;
        status: 'active' | 'typing' | 'idle';
        lastSeen: string;
    }>;
}

// Error event
interface WSErrorEvent {
    type: 'error';
    code: string;
    message: string;
    chatId?: string;
    messageId?: string;
}
```

For WebSocket implementation details, see [websocket.md](./websocket.md).

## Error Handling

### Error Format
```typescript
interface ErrorResponse {
    error: {
        code: string;      // Error code
        message: string;   // Human-readable message
        details?: any;     // Additional error details
        requestId?: string; // Request ID for tracking
    };
}
```

### Common Error Codes
- `INVALID_REQUEST`: Invalid request format or parameters
- `UNAUTHORIZED`: Authentication required or failed
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

### Rate Limit Errors
```typescript
interface RateLimitError {
    error: {
        code: 'RATE_LIMITED';
        message: string;
        details: {
            limit: number;
            remaining: number;
            reset: number;  // Unix timestamp
            retryAfter: number; // Seconds
        };
    };
}
```

## Implementation Examples

### Chat Stream Handling
```typescript
const processStream = async (response: Response) => {
    const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            // Parse SSE data
            const events = value
                .split('\n\n')
                .filter(Boolean)
                .map(event => {
                    const data = event.replace('data: ', '');
                    return JSON.parse(data);
                });

            for (const event of events) {
                switch (event.type) {
                    case 'start':
                        onStart(event);
                        break;
                    case 'content':
                        onContent(event);
                        break;
                    case 'error':
                        onError(event);
                        break;
                    case 'done':
                        onDone(event);
                        break;
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
};
```

For more information:
- See [authentication.md](./authentication.md) for auth flows
- See [websocket.md](./websocket.md) for WebSocket details
- See [streaming.md](../technical/streaming.md) for streaming implementation
- See [rate-limiting.md](../technical/rate-limiting.md) for rate limit details
