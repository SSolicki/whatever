# API Documentation Template

## Overview
Brief description of the API endpoint or WebSocket event.

### Version Information
- **API Version**: v1.0.0
- **Last Updated**: YYYY-MM-DD
- **Stability**: Stable/Beta/Experimental

### Authentication
- **Type**: Bearer Token
- **Required**: Yes/No
- **Scope**: Required permissions

## HTTP Endpoints

### Endpoint: `/api/resource`
#### Method: `GET/POST/PUT/DELETE`

#### Request
##### Headers
```json
{
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

##### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `param1` | string | Yes | - | Description |
| `param2` | number | No | 10 | Description |

##### Request Body
```typescript
interface RequestBody {
    field1: string;
    field2: number;
    field3?: {
        subField1: string;
        subField2: boolean;
    };
}
```

```json
{
    "field1": "value1",
    "field2": 42,
    "field3": {
        "subField1": "value",
        "subField2": true
    }
}
```

#### Response
##### Success Response (200 OK)
```typescript
interface SuccessResponse {
    status: "success";
    data: {
        id: string;
        field1: string;
        field2: number;
        created_at: string;
    };
    meta?: {
        total: number;
        page: number;
    };
}
```

```json
{
    "status": "success",
    "data": {
        "id": "123",
        "field1": "value1",
        "field2": 42,
        "created_at": "2024-02-23T12:00:00Z"
    },
    "meta": {
        "total": 100,
        "page": 1
    }
}
```

##### Error Responses
###### 400 Bad Request
```json
{
    "status": "error",
    "code": "INVALID_PARAMETERS",
    "message": "Invalid parameters provided",
    "details": {
        "field1": "Field is required"
    }
}
```

###### 401 Unauthorized
```json
{
    "status": "error",
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
}
```

###### 403 Forbidden
```json
{
    "status": "error",
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
}
```

###### 404 Not Found
```json
{
    "status": "error",
    "code": "NOT_FOUND",
    "message": "Resource not found"
}
```

## WebSocket Events

### Event: `resource.update`
#### Event Type
```typescript
interface ResourceUpdateEvent {
    type: 'resource.update';
    data: {
        id: string;
        field1: string;
        timestamp: string;
    };
}
```

#### Direction
- Client → Server
- Server → Client
- Bidirectional

#### Example Payload
```json
{
    "type": "resource.update",
    "data": {
        "id": "123",
        "field1": "updated value",
        "timestamp": "2024-02-23T12:00:00Z"
    }
}
```

## Rate Limiting
### Limits
- Rate: X requests per Y seconds
- Burst: Z requests maximum
- Window: Rolling/Fixed

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1614556800
```

### Rate Limit Response (429 Too Many Requests)
```json
{
    "status": "error",
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
        "retry_after": 60
    }
}
```

## Code Examples

### cURL
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": 42
  }' \
  https://api.example.com/api/resource
```

### TypeScript/JavaScript
```typescript
const createResource = async (data: RequestBody): Promise<SuccessResponse> => {
    const response = await fetch('/api/resource', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error('Request failed');
    }
    
    return response.json();
};

// Usage example
try {
    const result = await createResource({
        field1: 'value1',
        field2: 42
    });
    console.log('Success:', result);
} catch (error) {
    console.error('Error:', error);
}
```

### WebSocket Example
```typescript
const socket = new WebSocket('wss://api.example.com/ws');

// Connection handling
socket.onopen = () => {
    console.log('Connected to WebSocket');
    
    // Subscribe to updates
    socket.send(JSON.stringify({
        type: 'subscribe',
        resource: 'resource.update'
    }));
};

// Event handling
socket.onmessage = (event: MessageEvent) => {
    const data: ResourceUpdateEvent = JSON.parse(event.data);
    console.log('Received update:', data);
};

// Error handling
socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Cleanup
socket.onclose = () => {
    console.log('Disconnected from WebSocket');
};
```

## Related Documentation
- [Technical Documentation](../technical/README.md)
- [Development Guide](../guides/developer.md)
- [Authentication Guide](authentication.md)

## Navigation
> Documentation / API Documentation / [Endpoint Name]

- [Documentation Home](../index.md)
- [API Documentation](README.md)
- [Contributing](../CONTRIBUTING.md)
