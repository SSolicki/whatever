# Development Guidelines

This document outlines best practices and guidelines for maintaining code quality in the Open WebUI project.

## Code Organization

### Component Organization
- Follow feature-based directory structure
- Group related components in feature-specific directories
- Include README.md in each feature directory explaining:
  - Purpose of the components
  - Component relationships
  - Usage guidelines
  - Architecture decisions
- Maintain clear separation between layout and feature components
- Use PaneGroup for resizable layouts when appropriate

Example directory structure:
```
src/lib/components/
├── chat/                # Chat feature directory
│   ├── README.md       # Feature documentation
│   ├── Chat.svelte     # Main chat component
│   ├── ModelSelector/  # Model selection components
│   │   └── Selector.svelte
│   └── Sidebar/       # Chat sidebar components
│       ├── ChatSidebar.svelte
│       ├── ChatItem.svelte
│       └── ChatMenu.svelte
├── collaborate/       # Document collaboration
│   ├── README.md     # Feature documentation
│   ├── Document/     # Document editing
│   │   ├── DocumentView.svelte
│   │   └── DocumentEditor.svelte
│   └── Sidebar/     # Document management
│       ├── CollaborateSidebar.svelte
│       └── DocumentList.svelte
├── layout/          # Layout components
│   ├── AppSidebar/  # App navigation
│   └── shared/      # Shared layout components
└── shared/          # Shared feature components
    └── components/  # Reusable UI components
```

### Knowledge Store Organization
```
backend/
├── api/v1/knowledge.py           # Knowledge store endpoints
├── database/
│   └── models/
│       └── knowledge.py          # Knowledge store models
├── services/
│   ├── knowledge.py             # Knowledge store service
│   └── vector.py               # Vector database service
└── schemas/
    └── knowledge.py            # Knowledge store schemas

frontend/src/
├── lib/
│   ├── apis/knowledge/         # Knowledge store API client
│   ├── components/knowledge/   # Knowledge store components
│   └── stores/knowledge.ts     # Knowledge store state
└── routes/knowledge/          # Knowledge store pages
```

### Layout Guidelines
- Use PaneGroup for resizable panel layouts
- Implement consistent sizing constraints
- Support both desktop and mobile layouts
- Handle panel resizing gracefully
- Maintain proper z-index layering
- Consider touch interactions for resizable elements

### Component Layout Patterns
- For dropdowns in padded containers:
  * Calculate full width using `calc(100% + padding*2)`
  * Use negative margins to align with container edges
  * Example: `w-[calc(100%+2rem)] -ml-4` for 1rem padding
- Maintain consistent width handling across similar components
- Consider parent container constraints when positioning overlays
- Use relative units for flexible sizing

### Component Naming and Imports
- Use descriptive, specific names for components (e.g., `DocumentEditor.svelte` instead of `Editor.svelte`)
- Verify component names using IDE autocompletion before importing
- Consider using path aliases (`$lib/components/`) instead of relative imports (`../../`) for better maintainability
- Double-check directory structure when moving or refactoring components

### Store Management
- Keep store interfaces minimal and focused
- Document all store methods and their purposes
- Use Svelte's reactive store syntax ($store) for consistency
- Avoid redundant store update methods
- Clean up store subscriptions in onDestroy
- Test store interactions thoroughly
- Validate store method existence before usage
- Keep store methods simple and predictable

### Real-time State Management
- Use WebSocket for real-time updates
- Implement proper connection handling:
  ```typescript
  // Socket connection management
  let socket: Socket;
  
  onMount(() => {
    socket = io({
      auth: { token: getAuthToken() },
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    return () => {
      socket.disconnect();
    };
  });
  
  // Event handling
  socket.on('documents:update', (data) => {
    documentStore.update(data);
  });
  ```
- Handle connection errors gracefully
- Implement reconnection logic
- Clean up socket listeners on component destroy
- Use proper room management for collaboration
- Implement conflict resolution strategies

### State Updates
- Prefer direct store updates ($store = value) over store.update()
- Clean up subscriptions and event listeners
- Handle store initialization properly
- Validate store values before usage
- Document store dependencies
- Implement proper debouncing for real-time updates:
  ```typescript
  const debouncedUpdate = debounce((content: string) => {
    socket.emit('document:update', { content });
  }, 500);
  ```

### API Integration
- Match API parameters exactly
- Document API parameter requirements
- Handle API errors gracefully
- Validate API responses
- Keep API interfaces consistent
- Implement proper WebSocket event handling

### Accessibility Standards
- All interactive elements must be keyboard-accessible
- When using non-semantic elements (like `div`) for interaction:
  ```svelte
  <div
    role="button"
    tabindex="0"
    on:click={handler}
    on:keydown={(e) => e.key === 'Enter' && handler()}
    aria-label="Descriptive action text"
  >
  ```
- Include ARIA labels for elements that need description for screen readers
- Ensure proper heading hierarchy (`h1` through `h6`)
- Provide text alternatives for images and icons
- Ensure collaborative features are accessible

## Naming Conventions

### Knowledge Store Patterns
- Use `Knowledge` prefix for all related classes and interfaces
- Use `vector` prefix for vector database related functions
- Follow consistent naming across frontend and backend:
  ```typescript
  // Frontend
  interface KnowledgeEntry { ... }
  class KnowledgeService { ... }
  const knowledgeStore = writable<KnowledgeState>({ ... });

  // Backend
  class KnowledgeModel(Base): ...
  class KnowledgeService: ...
  class VectorService: ...
  ```

## Knowledge Store Components
```typescript
// Knowledge entry component
export default function KnowledgeEntry({
    // Props at the top
    entry,
    onUpdate,
    onDelete,
}: KnowledgeEntryProps) {
    // State management
    const { entries, updateEntry } = useKnowledgeStore();
    
    // Event handlers
    const handleUpdate = async () => {
        await updateEntry(entry.id, entry);
        onUpdate?.(entry);
    };
    
    // Render methods
    const renderMetadata = () => (
        <div class="metadata">
            <span>{entry.created_at}</span>
            <span>{entry.author}</span>
        </div>
    );
    
    // Component JSX
    return (
        <div class="knowledge-entry">
            <h2>{entry.title}</h2>
            {renderMetadata()}
            <p>{entry.content}</p>
            <div class="actions">
                <button onClick={handleUpdate}>Update</button>
                <button onClick={() => onDelete?.(entry.id)}>Delete</button>
            </div>
        </div>
    );
}
```

## Vector Service Pattern
```python
class VectorService:
    """Vector database service for knowledge store"""
    
    def __init__(self, client: QdrantClient):
        self.client = client
        
    async def create_collection(self):
        """Create knowledge store collection"""
        
    async def upsert_vectors(self, vectors: List[Vector]):
        """Add or update vectors"""
        
    async def search_similar(self, query: str, limit: int = 5):
        """Search for similar vectors"""
        
    async def delete_vectors(self, ids: List[str]):
        """Delete vectors by ID"""
```

## Best Practices

### Knowledge Store Implementation
1. Always handle vector operations asynchronously
2. Implement proper error handling for database operations
3. Use transactions for related operations
4. Cache frequently accessed entries
5. Implement proper cleanup for file attachments
6. Use proper typing for all functions and variables
7. Follow REST conventions for API endpoints
8. Implement proper validation for all inputs
9. Use appropriate status codes for responses
10. Document all public interfaces

## Quality Assurance

### Pre-commit Checklist
1. Run build process locally: `npm run build`
2. Address all TypeScript and ESLint warnings
3. Verify accessibility warnings in the console
4. Test keyboard navigation through new/modified interfaces
5. Check mobile responsiveness if layout changes were made
6. Test real-time collaboration features
7. Verify WebSocket event handling
8. Run appropriate tests (see [TESTING.md](./TESTING.md))

### Common Pitfalls to Avoid
- Importing non-existent components without verification
- Using click handlers without keyboard event handlers
- Hardcoding values that should be configurable
- Missing accessibility attributes on interactive elements
- Incomplete mobile responsive design considerations
- Not handling WebSocket disconnections
- Missing cleanup of event listeners
- Not implementing proper error handling for real-time features

## Testing
For comprehensive testing guidelines, requirements, and best practices, please refer to [TESTING.md](./TESTING.md).

## Mobile-First Development
- Design and implement for mobile first
- Test responsive breakpoints thoroughly
- Ensure touch targets are appropriately sized (minimum 44x44 pixels)
- Verify overlay and modal behavior on mobile devices
- Test collaborative features on mobile devices

## Performance Considerations
- Lazy load components when possible
- Optimize image assets before committing
- Monitor bundle size impacts of new dependencies
- Use appropriate caching strategies
- Implement efficient WebSocket message handling
- Use proper debouncing for real-time updates
- Monitor WebSocket connection health

## Documentation
- Document complex component interactions
- Include JSDoc comments for utility functions
- Update README.md when adding new features
- Keep CHANGELOG.md up to date with significant changes
- Document WebSocket events and handlers
- Maintain clear documentation of real-time features

## Related Documentation
- [backend.md](./backend.md) - Backend architecture and API documentation
- [collaborate.md](./collaborate.md) - Document collaboration system
- [stores.md](./stores.md) - Frontend store architecture
- [streaming.md](./streaming.md) - Real-time data streaming

Remember: A little extra time spent on proper implementation saves hours of debugging and maintenance later.
