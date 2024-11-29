# Frontend Architecture Guide
_Version: 1.2.0_
_Last Updated: 2024-02-21_

## Overview
This document outlines the frontend architecture principles, patterns, and best practices for our SvelteKit-based web application, including chat functionality, document collaboration, and knowledge management features.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm 8+
- VSCode (recommended)
  - Svelte extension
  - ESLint extension
  - Prettier extension

### Environment Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Environment Configuration
```bash
# Required environment variables (.env)
NODE_ENV=development
API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws

# Optional development variables
DEBUG=true
API_TIMEOUT=30000
VITE_ENABLE_MOCK=false
```

## Project Structure
```
src/
├── lib/                    # Shared components and utilities
│   ├── apis/              # API client modules
│   │   ├── chat/         # Chat API client
│   │   ├── documents/    # Document API client
│   │   ├── auth/         # Authentication client
│   │   └── knowledge/    # Knowledge store API client
│   ├── components/        # Reusable UI components
│   │   ├── common/       # Shared components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── Modal/
│   │   ├── chat/         # Chat-related components
│   │   │   ├── ModelSelector/
│   │   │   └── MessageList/
│   │   ├── layout/       # Layout components
│   │   ├── knowledge/    # Knowledge store components
│   │   │   ├── KnowledgeList.svelte    # Knowledge entries list
│   │   │   ├── KnowledgeEditor.svelte  # Entry creation/editing
│   │   │   ├── FileUpload.svelte       # File attachment handling
│   │   │   └── SearchBar.svelte        # Semantic search interface
│   ├── stores/            # State management
│   │   ├── index.ts
│   └── utils/            # Helper functions
├── routes/                # SvelteKit routes
│   ├── +layout.svelte    # Root layout
│   ├── +error.svelte     # Error boundary
│   ├── (protected)/      # Auth-required routes
│   ├── chat/            # Chat pages
│   ├── docs/            # Document pages
│   ├── auth/            # Auth pages
│   └── knowledge/       # Knowledge store pages
└── tests/                # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

## Core Architecture

### 1. Component Design
```typescript
// Base component interface
interface ComponentProps {
    class?: string;
    style?: string;
    ["data-testid"]?: string;
}

// Example component with proper typing
interface ButtonProps extends ComponentProps {
    variant: 'primary' | 'secondary' | 'ghost';
    size: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
}
```

### 2. State Management
```typescript
// App-wide state
interface AppState {
    theme: 'light' | 'dark' | 'system';
    settings: UserSettings;
    config: AppConfig;
    user: UserInfo | null;
}

// Component-local state
interface LocalState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

// Store creation with type safety
function createLocalStore<T>(initial: T): Writable<LocalState<T>> {
    return writable({
        data: initial,
        loading: false,
        error: null
    });
}
```

### 3. Event Handling
```typescript
// Typed event dispatcher
interface ChatEvents {
    'chat:start': { id: string; model: string };
    'chat:message': { id: string; content: string };
    'chat:error': { id: string; error: Error };
    'chat:finish': { id: string; content: string };
}

const dispatch = createEventDispatcher<ChatEvents>();

// Event handler with error boundary
async function handleEvent(event: ChatEvent) {
    try {
        dispatch('chat:start', {
            id: event.id,
            model: event.model
        });
        
        // Event processing
        
        dispatch('chat:finish', {
            id: event.id,
            content: event.content
        });
    } catch (error) {
        dispatch('chat:error', {
            id: event.id,
            error
        });
    }
}
```

## Knowledge Store Integration

### API Client
The knowledge store API client (`lib/apis/knowledge/client.ts`) provides methods for interacting with the backend:

```typescript
class KnowledgeClient {
    async createEntry(data: KnowledgeEntry): Promise<string>;
    async updateEntry(id: string, data: Partial<KnowledgeEntry>): Promise<void>;
    async deleteEntry(id: string): Promise<void>;
    async searchEntries(query: string): Promise<KnowledgeEntry[]>;
    async uploadFile(entryId: string, file: File): Promise<void>;
}
```

### State Management
Knowledge store state is managed through a dedicated Svelte store (`lib/stores/knowledge.ts`):

```typescript
interface KnowledgeState {
    entries: KnowledgeEntry[];
    selectedEntry: KnowledgeEntry | null;
    searchResults: KnowledgeEntry[];
    isLoading: boolean;
    error: Error | null;
}

export const knowledgeStore = writable<KnowledgeState>({
    entries: [],
    selectedEntry: null,
    searchResults: [],
    isLoading: false,
    error: null
});
```

### UI Components
Knowledge store UI components provide a rich user interface for managing knowledge entries:

- `KnowledgeList.svelte`: Displays paginated list of entries with filtering
- `KnowledgeEditor.svelte`: Form for creating/editing entries with validation
- `FileUpload.svelte`: Handles file attachments with progress tracking
- `SearchBar.svelte`: Semantic search interface with auto-suggestions

## Layout System

### 1. Responsive Container
```typescript
interface ContainerProps extends ComponentProps {
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    fluid?: boolean;
}

const containerSizes = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl'
};
```

### 2. Grid System
```typescript
interface GridProps extends ComponentProps {
    cols?: number | { sm?: number; md?: number; lg?: number };
    gap?: 'none' | 'sm' | 'md' | 'lg';
    align?: 'start' | 'center' | 'end';
    justify?: 'start' | 'center' | 'end' | 'between';
}
```

### 3. Flex Layout
```typescript
interface FlexProps extends ComponentProps {
    direction?: 'row' | 'col';
    wrap?: boolean;
    gap?: 'none' | 'sm' | 'md' | 'lg';
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between';
}
```

## Real-time Integration

### WebSocket Management
```typescript
interface WebSocketConfig {
    url: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    onMessage?: (data: unknown) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

class WebSocketManager {
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private config: WebSocketConfig;

    constructor(config: WebSocketConfig) {
        this.config = {
            reconnectAttempts: 3,
            reconnectDelay: 1000,
            ...config
        };
    }

    connect() {
        try {
            this.socket = new WebSocket(this.config.url);
            this.setupEventHandlers();
        } catch (error) {
            this.handleError(error);
        }
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.config.onMessage?.(data);
            } catch (error) {
                this.handleError(error);
            }
        };

        this.socket.onerror = (error) => {
            this.handleError(error);
        };

        this.socket.onclose = () => {
            this.handleClose();
        };
    }

    private handleError(error: Error) {
        this.config.onError?.(error);
        this.attemptReconnect();
    }

    private handleClose() {
        this.config.onClose?.();
        this.attemptReconnect();
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= (this.config.reconnectAttempts ?? 3)) {
            return;
        }

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, this.config.reconnectDelay);
    }
}
```

## Best Practices

### 1. Component Development
- Use TypeScript for all components
- Implement proper prop validation
- Handle loading and error states
- Follow accessibility guidelines
- Write unit tests for components

### 2. State Management
- Use stores for shared state
- Keep component state minimal
- Implement proper cleanup
- Use derived stores for computed values
- Handle side effects in stores

### 3. Performance
- Lazy load routes and components
- Implement proper caching
- Optimize bundle size
- Use proper load functions
- Handle SSR appropriately

### 4. Testing
- Write unit tests for components
- Implement integration tests
- Use end-to-end tests for critical paths
- Test error boundaries
- Mock external dependencies

For more detailed information:
- See [chat.md](../features/chat.md) for chat implementation
- See [stores.md](../technical/stores.md) for state management
- See [streaming.md](../technical/streaming.md) for real-time features
