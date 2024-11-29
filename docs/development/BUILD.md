# Build Configuration Guide

## Overview
This document outlines the build configuration and best practices for the Whatever chat interface. Our build system uses Vite and is optimized for performance and maintainability.

## Build Configuration

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Optimized chunking strategy
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
```

### Key Features
- ESNext target for modern JavaScript features
- Source maps for debugging
- Optimized chunk naming strategy
- Automatic code splitting
- Asset fingerprinting

## Best Practices

### Code Organization
- Keep related code in the same chunk
- Use dynamic imports for large features
- Optimize component imports
- Follow the module pattern

### Performance
- Minimize bundle size
- Use code splitting effectively
- Optimize asset loading
- Enable compression

### Development
- Use TypeScript for better type safety
- Follow Svelte best practices
- Keep components modular
- Use proper import statements

## Common Issues and Solutions

### External Module Resolution
- Avoid manual chunks for external modules
- Use proper import statements
- Handle dependencies correctly
- Check module compatibility

### Build Warnings
- Address unused exports
- Fix import warnings
- Handle type issues
- Check dependency versions

### Performance Issues
- Optimize chunk sizes
- Use lazy loading
- Implement code splitting
- Monitor bundle size

## Docker Build

### Configuration
```dockerfile
# Dockerfile
FROM node:20-alpine3.19 AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
```

### Best Practices
- Use multi-stage builds
- Optimize layer caching
- Minimize image size
- Handle dependencies efficiently

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`

### Docker Development
1. Build image: `docker-compose build`
2. Start containers: `docker-compose up`
3. Watch logs: `docker-compose logs -f`

## Troubleshooting

### Common Build Errors
- Module resolution issues
- Type errors
- Chunk configuration problems
- External dependency conflicts

### Solutions
- Check import statements
- Verify dependency versions
- Review build configuration
- Monitor chunk sizes

## Vector Database Setup

### Prerequisites
- Qdrant vector database
  * Docker: `docker pull qdrant/qdrant`
  * Local: Follow [Qdrant installation guide](https://qdrant.tech/documentation/install/)

## Environment Setup

### Backend Environment
```bash
# Required environment variables (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# Vector database configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=knowledge_store
QDRANT_VECTOR_SIZE=1536

# Optional development variables
DEBUG=true
LOG_LEVEL=debug
ENABLE_CORS=true
```

### Frontend Environment
```bash
# Required environment variables (.env)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws

# Optional development variables
VITE_DEBUG=true
VITE_MOCK_API=false
```

## Resources
- [Vite Documentation](https://vitejs.dev/)
- [Svelte Documentation](https://svelte.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
