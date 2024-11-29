# Testing Guidelines
_Version: 1.1.0_
_Last Updated: 2024-02-22_

## Overview
This document outlines testing requirements, standards, and best practices for both frontend and backend development.

## Testing Requirements

### Frontend Testing
- Use Vitest for unit and integration tests
- Test coverage requirements:
  - Minimum 80% coverage for new code
  - 100% coverage for critical paths:
    - Authentication flows
    - Data validation
    - Error handling
    - API interactions
    - WebSocket connections
    - Real-time collaboration features
    - Knowledge store operations

### Backend Testing
- Use pytest for Python tests
- Follow test naming conventions
- Include integration tests where appropriate
- Mock external dependencies
- Test WebSocket events and handlers
- Test database operations
- Test vector database operations

## Running Tests

### Frontend
```bash
pnpm test:frontend           # Run tests
pnpm test:frontend:coverage  # Run with coverage
pnpm test:frontend:watch     # Development mode
```

### Backend
```bash
pytest                       # Run Python tests
pytest --cov                # Run with coverage
pytest tests/vector         # Run vector database tests
```

## Test Structure

### Unit Tests
```typescript
describe('Component/Service', () => {
    beforeEach(() => {
        // Set up test environment
    });

    it('should handle the happy path', async () => {
        // Test normal operation
    });

    it('should handle errors gracefully', async () => {
        // Test error scenarios
    });
});
```

#### Knowledge Store Tests
```typescript
describe('KnowledgeStore', () => {
    beforeEach(() => {
        // Set up test environment
        vi.mock('@/lib/apis/knowledge');
        vi.mock('@/lib/services/vector');
    });

    it('should create knowledge entry', async () => {
        const entry = {
            title: 'Test Entry',
            content: 'Test content',
            files: []
        };
        const result = await createEntry(entry);
        expect(result).toBeDefined();
    });

    it('should search entries', async () => {
        const query = 'test query';
        const results = await searchEntries(query);
        expect(results).toHaveLength(5);
    });
});
```

### WebSocket Tests
```typescript
describe('WebSocket Integration', () => {
    let socket: Socket;
    
    beforeEach(() => {
        socket = io('http://localhost:8000', {
            transports: ['websocket']
        });
    });

    afterEach(() => {
        socket.disconnect();
    });

    it('should connect successfully', (done) => {
        socket.on('connect', () => {
            expect(socket.connected).toBe(true);
            done();
        });
    });

    it('should handle document updates', (done) => {
        const testDoc = {
            id: 'test-id',
            content: 'test content'
        };

        socket.emit('document:update', testDoc);
        
        socket.on('document:updated', (data) => {
            expect(data.id).toBe(testDoc.id);
            expect(data.content).toBe(testDoc.content);
            done();
        });
    });

    it('should handle connection errors', (done) => {
        socket.on('connect_error', (error) => {
            expect(error).toBeDefined();
            done();
        });
    });
});
```

### Database Tests
```python
async def test_document_operations():
    # Test document creation
    doc = await create_document({
        'title': 'Test Doc',
        'content': 'Test content'
    })
    assert doc['id'] is not None
    
    # Test document update
    updated = await update_document(doc['id'], {
        'content': 'Updated content'
    })
    assert updated['content'] == 'Updated content'
    
    # Test version creation
    version = await create_version(doc['id'], {
        'content': 'Version 1'
    })
    assert version['document_id'] == doc['id']
```

### Integration Tests

#### Vector Database Tests
```python
def test_vector_service_operations():
    """Test vector database operations"""
    service = VectorService(get_test_client())
    
    # Test collection creation
    service.create_collection()
    assert service.collection_exists()
    
    # Test vector operations
    vectors = [
        Vector(id="1", embedding=[0.1] * 1536),
        Vector(id="2", embedding=[0.2] * 1536)
    ]
    service.upsert_vectors(vectors)
    
    # Test search
    results = service.search_similar("test query")
    assert len(results) > 0
```

### End-to-End Tests

#### Knowledge Store Workflow
```typescript
describe('Knowledge Store E2E', () => {
    it('should complete knowledge entry workflow', async () => {
        // Create entry
        await page.goto('/knowledge/new');
        await page.fill('[data-test="title"]', 'Test Entry');
        await page.fill('[data-test="content"]', 'Test content');
        await page.click('[data-test="submit"]');
        
        // Verify creation
        await expect(page.locator('[data-test="entry-title"]'))
            .toHaveText('Test Entry');
            
        // Search entry
        await page.fill('[data-test="search"]', 'Test');
        await expect(page.locator('[data-test="search-results"]'))
            .toContainText('Test Entry');
    });
});
```

## Best Practices

### 1. Mock External Services
- API calls
- Browser APIs
- Environment variables
- File system operations
- WebSocket connections
- Database operations

### 2. Test Real User Flows
- User interactions
- State changes
- Error recovery
- Loading states
- Real-time collaboration
- Document versioning
- Concurrent edits

### 3. Test WebSocket Integration
- Connection establishment
- Event handling
- Reconnection logic
- Error scenarios
- Room management
- Message broadcasting
- Connection cleanup

### 4. Test Database Operations
- Document CRUD operations
- Version management
- Concurrent access
- Transaction handling
- Error scenarios
- Data validation

### 5. Maintain Test Quality
- Keep tests focused and atomic
- Use meaningful test names
- Document complex test setups
- Clean up test resources
- Mock time-sensitive operations
- Handle asynchronous operations properly

## Testing Real-time Features

### 1. Connection Management
```typescript
it('should reconnect automatically', async () => {
    // Simulate disconnection
    socket.disconnect();
    
    // Wait for reconnection
    await new Promise<void>((resolve) => {
        socket.on('connect', () => {
            expect(socket.connected).toBe(true);
            resolve();
        });
    });
});
```

### 2. Collaborative Editing
```typescript
it('should sync document changes', async () => {
    const doc = { id: 'test', content: '' };
    const changes = [
        { type: 'insert', index: 0, text: 'Hello' },
        { type: 'insert', index: 5, text: ' World' }
    ];
    
    // Apply changes
    for (const change of changes) {
        socket.emit('document:change', { doc, change });
    }
    
    // Verify final state
    await new Promise<void>((resolve) => {
        socket.on('document:state', (data) => {
            expect(data.content).toBe('Hello World');
            resolve();
        });
    });
});
```

### 3. Conflict Resolution
```typescript
it('should resolve concurrent edits', async () => {
    const doc = { id: 'test', content: 'Initial' };
    
    // Simulate concurrent edits
    const edit1 = { index: 0, text: 'A' };
    const edit2 = { index: 0, text: 'B' };
    
    socket.emit('document:change', { doc, change: edit1 });
    socket.emit('document:change', { doc, change: edit2 });
    
    // Verify consistent final state
    await new Promise<void>((resolve) => {
        socket.on('document:state', (data) => {
            expect(data.version).toBeGreaterThan(doc.version);
            resolve();
        });
    });
});
```

## Related Documentation
- [development-guidelines.md](./development-guidelines.md) - Development standards and practices
- [collaborate.md](./collaborate.md) - Document collaboration system
- [stores.md](./stores.md) - Frontend store architecture
- [backend.md](./backend.md) - Backend architecture
