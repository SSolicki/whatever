# Troubleshooting Guide

## Common Issues and Solutions

### 1. Chat System Issues

#### Message Streaming Not Working
**Symptoms:**
- Messages not appearing in real-time
- Long delays between responses
- Stream appears to freeze

**Possible Causes and Solutions:**
1. WebSocket Connection Issues
   ```typescript
   // Check WebSocket connection status
   if (!socket.connected) {
     console.error('WebSocket disconnected');
     await reconnectWebSocket();
   }
   ```
   - Verify WebSocket connection in browser dev tools
   - Check network connectivity
   - Ensure WebSocket server is running

2. Stream Processing Errors
   ```typescript
   // Add error handling to stream processing
   try {
     for await (const chunk of stream) {
       // Process chunk
     }
   } catch (e) {
     if (e.name === 'AbortError') {
       console.log('Stream aborted');
     } else {
       console.error('Stream error:', e);
       // Implement retry logic
     }
   }
   ```
   - Check server logs for stream processing errors
   - Verify message format matches expected schema
   - Ensure proper error handling is implemented

3. Memory Issues
   - Monitor browser memory usage
   - Clear message history periodically
   - Implement pagination for long conversations

#### Authentication Failures
**Symptoms:**
- Unable to access chat
- Frequent disconnections
- "Unauthorized" errors

**Solutions:**
1. Token Validation
   ```typescript
   // Check token validity
   const isTokenValid = (token: string): boolean => {
     try {
       const decoded = jwt.decode(token);
       return decoded && decoded.exp > Date.now() / 1000;
     } catch {
       return false;
     }
   };
   ```
   - Verify token expiration
   - Check token format
   - Ensure proper token refresh logic

2. Session Management
   - Clear invalid sessions
   - Implement proper session timeout handling
   - Add session recovery mechanisms

### 2. Knowledge Store Issues

#### Vector Search Not Returning Expected Results
**Symptoms:**
- Search results irrelevant
- Missing expected matches
- Poor result ranking

**Solutions:**
1. Vector Database Health Check
   ```python
   async def check_vector_db_health():
       try:
           # Check collection exists
           collections = await vector_client.list_collections()
           if not collections:
               raise ValueError("No collections found")
           
           # Check vector dimensions
           collection = await vector_client.get_collection(collection_name)
           if collection.vector_size != expected_size:
               raise ValueError(f"Vector size mismatch: {collection.vector_size}")
           
           return True
       except Exception as e:
           logger.error(f"Vector DB health check failed: {e}")
           return False
   ```
   - Verify vector database connectivity
   - Check collection configuration
   - Validate vector dimensions

2. Embedding Quality
   - Verify embedding model is working correctly
   - Check for token limits
   - Validate embedding dimensions

3. Search Parameters
   ```python
   # Adjust search parameters
   results = await vector_service.search(
       collection_name=collection,
       query_vector=query_embedding,
       limit=10,  # Increase limit
       score_threshold=0.7  # Adjust threshold
   )
   ```
   - Adjust similarity thresholds
   - Modify result limit
   - Fine-tune search parameters

#### File Processing Failures
**Symptoms:**
- Files not being processed
- Processing stuck or timing out
- Incomplete vector storage

**Solutions:**
1. File Size and Format
   ```typescript
   // Implement file validation
   const validateFile = (file: File): boolean => {
     const maxSize = 10 * 1024 * 1024; // 10MB
     const allowedTypes = ['text/plain', 'application/pdf', 'application/json'];
     
     if (file.size > maxSize) {
       throw new Error('File too large');
     }
     
     if (!allowedTypes.includes(file.type)) {
       throw new Error('Unsupported file type');
     }
     
     return true;
   };
   ```
   - Check file size limits
   - Verify supported formats
   - Validate file integrity

2. Processing Pipeline
   - Monitor processing stages
   - Implement retry mechanisms
   - Add progress tracking

### 3. Performance Issues

#### Slow Page Load Times
**Symptoms:**
- Long initial load times
- Delayed component rendering
- Poor responsiveness

**Solutions:**
1. Bundle Size
   ```javascript
   // Implement code splitting
   const Chat = lazy(() => import('./components/Chat'));
   const KnowledgeStore = lazy(() => import('./components/KnowledgeStore'));
   ```
   - Analyze bundle size
   - Implement code splitting
   - Optimize dependencies

2. Data Fetching
   ```typescript
   // Implement data prefetching
   const prefetchData = async () => {
     const [chatData, knowledgeData] = await Promise.all([
       chatStore.preloadChats(),
       knowledgeStore.preloadEntries()
     ]);
     return { chatData, knowledgeData };
   };
   ```
   - Implement data prefetching
   - Use proper caching strategies
   - Optimize API calls

#### Memory Leaks
**Symptoms:**
- Increasing memory usage
- Browser tab crashes
- Degrading performance

**Solutions:**
1. Resource Cleanup
   ```typescript
   // Proper cleanup in components
   onDestroy(() => {
     // Clean up subscriptions
     subscriptions.forEach(sub => sub.unsubscribe());
     
     // Close WebSocket connections
     socket?.disconnect();
     
     // Clear large data structures
     messages.set([]);
     cache.clear();
   });
   ```
   - Clean up event listeners
   - Dispose of WebSocket connections
   - Clear large data structures

2. Memory Monitoring
   ```typescript
   // Implement memory usage tracking
   const trackMemoryUsage = () => {
     if ('memory' in performance) {
       const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
       const usage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
       
       if (usage > 80) {
         console.warn('High memory usage detected');
         // Implement cleanup strategies
       }
     }
   };
   ```
   - Monitor memory usage
   - Implement cleanup strategies
   - Add memory usage warnings

### 4. Development Environment Issues

#### Build Failures
**Symptoms:**
- Failed builds
- TypeScript errors
- Missing dependencies

**Solutions:**
1. Dependencies
   ```bash
   # Clear dependency cache and reinstall
   rm -rf node_modules
   rm package-lock.json
   npm cache clean --force
   npm install
   ```
   - Clear npm cache
   - Reinstall dependencies
   - Check for version conflicts

2. TypeScript Configuration
   ```json
   // tsconfig.json checks
   {
     "compilerOptions": {
       "strict": true,
       "skipLibCheck": true,
       "types": ["svelte", "node"],
       "paths": {
         "$lib/*": ["./src/lib/*"]
       }
     }
   }
   ```
   - Verify TypeScript configuration
   - Check type definitions
   - Update type declarations

## Monitoring and Debugging

### 1. Frontend Monitoring
```typescript
// Implement error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    
    // Send to error tracking service
    errorTracker.capture(error, errorInfo);
  }
}
```

### 2. Backend Monitoring
```python
# Implement health checks
@app.get("/health")
async def health_check():
    checks = {
        "database": await check_database(),
        "vector_db": await check_vector_db(),
        "redis": await check_redis(),
        "file_storage": await check_file_storage()
    }
    
    if not all(checks.values()):
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "checks": checks}
        )
    
    return {"status": "healthy", "checks": checks}
```

## Error Recovery Procedures

### 1. Data Recovery
```python
# Implement data backup and recovery
async def backup_knowledge_base():
    try:
        # Backup vector database
        await vector_service.export_collection(
            collection_name,
            f"backup_{datetime.now().isoformat()}.json"
        )
        
        # Backup metadata
        await db.backup_metadata(output_dir="backups")
        
        return True
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return False
```

### 2. System Recovery
```python
# Implement system recovery procedures
async def recover_system_state():
    try:
        # Check and repair database connections
        await db.check_and_repair()
        
        # Rebuild indices
        await vector_service.rebuild_indices()
        
        # Clear invalid sessions
        await redis.clear_invalid_sessions()
        
        return True
    except Exception as e:
        logger.error(f"Recovery failed: {e}")
        return False
```
