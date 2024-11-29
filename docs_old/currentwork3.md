# Vector Database Integration Analysis

## Current Implementation Analysis

### 1. Chroma Vector Database
- Implementation in `chroma.py` supports both HTTP and Persistent client modes
- Configuration requirements:
  - For HTTP mode:
    ```
    CHROMA_HTTP_HOST
    CHROMA_HTTP_PORT
    CHROMA_HTTP_HEADERS
    CHROMA_HTTP_SSL
    CHROMA_TENANT
    CHROMA_DATABASE
    ```
  - For Persistent mode:
    ```
    CHROMA_DATA_PATH
    CHROMA_TENANT
    CHROMA_DATABASE
    ```
  - Optional auth settings:
    ```
    CHROMA_CLIENT_AUTH_PROVIDER
    CHROMA_CLIENT_AUTH_CREDENTIALS
    ```

### 2. Qdrant Vector Database
- Implementation in `qdrant.py` requires:
  ```
  QDRANT_URI
  QDRANT_API_KEY
  ```
- Uses collection prefix "open-webui"
- Supports COSINE distance metric for vector similarity

## Required Changes

### 1. Docker Compose Updates
Add the following services to `docker-compose.prod.yaml`:

```yaml
  chroma:
    image: chromadb/chroma:latest
    container_name: chroma-prod
    volumes:
      - chroma-data:/chroma/data
    networks:
      - whatever_network_prod
    environment:
      - CHROMA_SERVER_AUTH_CREDENTIALS=admin:admin  # Change in production
      - CHROMA_SERVER_AUTH_PROVIDER=basic
    ports:
      - "8000:8000"  # Optional: for external access

  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-prod
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - whatever_network_prod
    environment:
      - QDRANT_API_KEY=${QDRANT_API_KEY}
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # GRPC API

volumes:
  chroma-data:
  qdrant-data:
```

### 2. Environment Variables to Add
Add to `.env.prod`:

```env
# Chroma Configuration
CHROMA_HTTP_HOST=chroma
CHROMA_HTTP_PORT=8000
CHROMA_HTTP_SSL=false
CHROMA_TENANT=default_tenant
CHROMA_DATABASE=default_database
CHROMA_CLIENT_AUTH_PROVIDER=basic
CHROMA_CLIENT_AUTH_CREDENTIALS=admin:admin  # Change in production

# Qdrant Configuration
QDRANT_URI=http://qdrant:6333
QDRANT_API_KEY=your_secure_api_key_here  # Change in production
```

## SearXNG Integration

### 1. Configuration Files Setup
Create the following configuration files in the `searxng` directory:

#### settings.yml
```yaml
use_default_settings: true
general:
  debug: false
  instance_name: "whatever Search"
  privacypolicy_url: false
  donation_url: false
  contact_url: false
  enable_metrics: true

search:
  safe_search: 0
  autocomplete: 'google'
  default_lang: "en"
  ban_time_on_fail: 5
  max_ban_time_on_fail: 120

server:
  secret_key: "your_generated_secret_key"  # Change this in production
  bind_address: "0.0.0.0"
  port: 8080
  base_url: false
  image_proxy: false
  http_protocol_version: "1.0"

ui:
  static_path: ""
  templates_path: ""
  default_theme: simple
  default_locale: en
  results_on_new_tab: false

redis:
  url: false

outgoing:
  request_timeout: 3.0
  max_request_timeout: 10.0
  pool_connections: 100
  pool_maxsize: 100
  enable_http2: true
  retries: 3
  retry_on_http_error: true
```

#### uwsgi.ini
```ini
[uwsgi]
http-socket = 0.0.0.0:8080
master = true
processes = 4
threads = 4
cheaper = 1
cheaper-initial = 1
cheaper-step = 1
cheaper-algo = spare
cheaper-overload = 5
memory-report = true
```

### 2. Docker Compose Configuration
The SearXNG service is already included in your docker-compose.prod.yaml. Ensure these environment variables are set in the `whatever` service:

```yaml
environment:
  - ENABLE_RAG_WEB_SEARCH=true
  - RAG_WEB_SEARCH_ENGINE=searxng
  - RAG_WEB_SEARCH_RESULT_COUNT=3
  - RAG_WEB_SEARCH_CONCURRENT_REQUESTS=10
  - SEARXNG_QUERY_URL=http://searxng:8080/search?q=<query>
```

### 3. Security Considerations
1. Generate a strong secret key for `settings.yml`
2. Consider implementing rate limiting
3. Set up proper network isolation
4. Monitor resource usage

### 4. Implementation Steps
1. Create the `searxng` directory in your project root
2. Add the configuration files as specified above
3. Update environment variables if needed
4. Verify SearXNG is accessible from the whatever service
5. Test search functionality through the UI

### 5. Performance Considerations
1. Adjust uwsgi processes and threads based on server capacity
2. Monitor memory usage and adjust cheaper settings
3. Configure appropriate timeouts for search requests
4. Implement caching if needed

## SearXNG Integration Analysis

### Current Setup Analysis

1. **Docker Configuration**
   - Image: `searxng/searxng:latest`
   - Port: 8081 (external) -> 8080 (internal)
   - Volume: `./searxng:/etc/searxng` (local directory mount)
   - Network: `whatever_network_prod`
   - Security: Minimal capabilities model implemented
   - Container name: `searxng-prod`

2. **Configuration Files**
   ```
   searxng/
   ├── settings.yml     # Main configuration file
   ├── uwsgi.ini       # Web server configuration
   └── limiter.toml    # Bot detection configuration
   ```

3. **Key Settings**
   - settings.yml:
     ```yaml
     use_default_settings: true
     server:
       secret_key: "f9e603d4191caab069b021fa0568391a33c8a837b470892c64461b5dd12464f4"
       limiter: false
       image_proxy: true
       port: 8080
       bind_address: "0.0.0.0"
     ui:
       static_use_hash: true
     search:
       safe_search: 0
       autocomplete: ""
       default_lang: ""
       formats:
         - html
         - json
     ```

   - limiter.toml:
     ```toml
     [botdetection.ip_limit]
     link_token = true
     ```

4. **Integration with Whatever**
   Environment variables in whatever service:
   ```yaml
   environment:
     - ENABLE_RAG_WEB_SEARCH=true
     - RAG_WEB_SEARCH_ENGINE=searxng
     - RAG_WEB_SEARCH_RESULT_COUNT=3
     - RAG_WEB_SEARCH_CONCURRENT_REQUESTS=10
     - SEARXNG_QUERY_URL=http://searxng-prod:8080/search?q=<query>
   ```

### Security Configuration
1. Docker security settings:
   ```yaml
   cap_drop:
     - ALL
   cap_add:
     - CHOWN
     - SETGID
     - SETUID
     - DAC_OVERRIDE
   security_opt:
     - no-new-privileges:true
   ```

2. Bot Detection:
   - Using IP-based bot detection with link token validation
   - No strict rate limiting to allow integration with Whatever

### Performance Configuration
1. uWSGI settings optimized for production:
   - Workers: Auto-scaled based on CPU cores
   - Threads: 4 per worker
   - Buffer size: 8192
   - Static file handling enabled
   - Logging optimized for privacy

### Troubleshooting
1. If search results are not appearing:
   - Verify network connectivity between whatever and searxng containers
   - Check searxng logs for any errors
   - Verify the SEARXNG_QUERY_URL is correct
   - Ensure the whatever service can reach searxng on port 8080

2. If performance issues occur:
   - Monitor uWSGI worker usage
   - Check memory consumption
   - Verify network latency between services

## Security Considerations
1. Both vector databases should be properly secured in production:
   - Set strong authentication credentials
   - Consider network isolation
   - Restrict port access to only necessary services

2. Update the backend service to include vector DB environment variables:
   ```yaml
   backend:
     environment:
       # ... existing vars ...
       - CHROMA_HTTP_HOST=${CHROMA_HTTP_HOST}
       - CHROMA_HTTP_PORT=${CHROMA_HTTP_PORT}
       - CHROMA_HTTP_SSL=${CHROMA_HTTP_SSL}
       - CHROMA_TENANT=${CHROMA_TENANT}
       - CHROMA_DATABASE=${CHROMA_DATABASE}
       - CHROMA_CLIENT_AUTH_PROVIDER=${CHROMA_CLIENT_AUTH_PROVIDER}
       - CHROMA_CLIENT_AUTH_CREDENTIALS=${CHROMA_CLIENT_AUTH_CREDENTIALS}
       - QDRANT_URI=${QDRANT_URI}
       - QDRANT_API_KEY=${QDRANT_API_KEY}
```

## Implementation Steps
1. Update `.env.prod` with the new environment variables
2. Update `docker-compose.prod.yaml` with the new services
3. Create necessary volumes for persistent storage
4. Update backend service configuration
5. Test the integration:
   - Verify connectivity from backend to both vector databases
   - Test basic operations (insert, search, delete)
   - Validate authentication and security measures

## Performance Considerations
1. Monitor memory usage of vector databases
2. Consider implementing connection pooling
3. Implement proper error handling for database connectivity
4. Set up health checks for the new services
