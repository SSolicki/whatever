# Store Management

This document describes the store management system. For related documentation, see:
- [Type Definitions](types.md)
- [Streaming Implementation](streaming.md)

## Core Stores

### Chat Store
The main store for managing chat state. See [type definitions](types.md#store-types) for detailed types.

## Store Architecture Documentation

## Overview
The application uses a centralized store system in `/src/lib/stores/index.ts` for state management. For more details, see [Store Management](store-management.md).

## Store Types

### Base Types
```typescript
interface BaseState {
    loading: boolean;
    error: Error | null;
}

interface Timestamps {
    created_at: string;
    updated_at: string;
}

interface Metadata extends Timestamps {
    id: string;
    title: string;
    description?: string;
    owner: string;
    is_public: boolean;
}
```

### Folder Types
```typescript
interface FolderItem extends Metadata {
    parent_id: string | null;
    is_expanded: boolean;
    level: number;
    children: string[];
    position: number;
}

interface FolderState extends BaseState {
    items: Record<string, FolderItem>;
    expandedFolders: Set<string>;
    draggedItem: { 
        id: string; 
        type: 'folder' | 'chat'; 
        title: string 
    } | null;
}
```

### Document Types
```typescript
interface DocumentMetadata extends Metadata {
    participants: string[];
    version: number;
}

interface DocumentVersion {
    id: string;
    document_id: string;
    content: string;
    timestamp: string;
    author: string;
    message?: string;
}

interface DocumentChange {
    type: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
    author: string;
    timestamp: string;
}

interface DocumentState extends BaseState {
    metadata: DocumentMetadata | null;
    content: string;
    versions: DocumentVersion[];
    participants: Set<string>;
    isDirty: boolean;
    lastSaved: string | null;
    currentVersion: number;
}
```

### Chat Types
```typescript
interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    parentId: string | null;
    childrenIds: string[];
    done: boolean;
    isError?: boolean;
    info?: {
        usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
        model?: string;
        finish_reason?: string;
    };
}

interface ChatState extends BaseState {
    history: {
        messages: Record<string, Message>;
        currentId: string | null;
    };
    settings: ChatSettings;
    selectedModels: string[];
    params?: Record<string, any>;
}

interface ChatStore {
  chats: any[];
  currentChat: any;
  selectedModels: string[];
  settings: ChatSettings;
  error: any;
}

interface ChatSettings {
  temperature: number;
  maxTokens: number;
  stream: boolean;
  responseAutoCopy: boolean;
  responseAutoPlayback: boolean;
  notificationEnabled: boolean;
  scrollOnBranchChange: boolean;
}
```

### Additional Core Types
```typescript
interface ConfigState {
    webui_name: string;
    model_download_pool: string;
    usage_pool: string;
}

interface UserState {
    isAuthenticated: boolean;
    profile: any;
    preferences: any;
}

interface ModelState {
    // Add model state properties here
}

interface AppSettings {
    // Add app settings properties here
}

interface ThemeState {
    mode: 'light' | 'dark';
    accent: string;
}

interface WebSocketState {
    connected: boolean;
    error: Error | null;
}
```

## Store Implementations

### Document Stores
```typescript
// Active document store
export const activeDocument = writable<DocumentState>({
    metadata: null,
    content: '',
    versions: [],
    participants: new Set(),
    loading: false,
    error: null,
    isDirty: false,
    lastSaved: null,
    currentVersion: 0
});

// Document list store
export const documents = writable<DocumentMetadata[]>([]);

// Document participants store
export const documentParticipants = writable<Map<string, Set<string>>>(new Map());

// Document changes store for real-time sync
export const documentChanges = writable<Map<string, DocumentChange[]>>(new Map());
```

### Folder Store
The folder store (`src/lib/stores/index.ts`) implements a REST API-based approach with the following endpoints:

```typescript
// Folder API endpoints
interface FolderAPI {
    getFolders(): Promise<FolderItem[]>;
    getFolderById(id: string): Promise<FolderItem>;
    createNewFolder(data: NewFolderData): Promise<FolderItem>;
    updateFolderNameById(id: string, name: string): Promise<void>;
    updateFolderParentIdById(id: string, parentId: string | null): Promise<void>;
    updateFolderIsExpandedById(id: string, isExpanded: boolean): Promise<void>;
    updateFolderItemsById(id: string, items: string[]): Promise<void>;
    deleteFolderById(id: string): Promise<void>;
}

// Folder store implementation
export const folderStore = {
    ...derived(baseFolderStore, ($store) => ({
        ...$store,
        async createFolder(data: NewFolderData) {
            const folder = await api.createNewFolder(data);
            baseFolderStore.update(s => ({
                ...s,
                items: { ...s.items, [folder.id]: folder }
            }));
            return folder;
        },
        async updateFolder(id: string, updates: Partial<FolderItem>) {
            if (updates.title) {
                await api.updateFolderNameById(id, updates.title);
            }
            if (updates.parent_id !== undefined) {
                await api.updateFolderParentIdById(id, updates.parent_id);
            }
            if (updates.is_expanded !== undefined) {
                await api.updateFolderIsExpandedById(id, updates.is_expanded);
            }
            baseFolderStore.update(s => ({
                ...s,
                items: { 
                    ...s.items, 
                    [id]: { ...s.items[id], ...updates }
                }
            }));
        }
    }))
};
```

### Chat Stores
```typescript
// Chat state store
export const chatState = writable<ChatState>({
    history: {
        messages: {},
        currentId: null
    },
    settings: defaultChatSettings,
    selectedModels: [],
    loading: false,
    error: null
});

// Paginated chats store for chat list management
export const paginatedChats = createPaginatedChatsStore({
    pageSize: INITIAL_PAGE_SIZE,
    initialState: {
        items: [],
        total: 0,
        hasMore: false,
        currentPage: 1,
        loading: false,
        error: null
    }
});

// Active chat store
export const activeChat = derived(
    chatState,
    $state => $state.history.messages[$state.history.currentId ?? '']
);

// Chat store
export const chatStore = writable<ChatStore>({
  chats: [],
  currentChat: undefined,
  selectedModels: [],
  settings: {
    temperature: 0.7,
    maxTokens: 1000,
    stream: true,
    responseAutoCopy: false,
    responseAutoPlayback: false,
    notificationEnabled: false,
    scrollOnBranchChange: true
  },
  error: undefined
});

// Settings store
export const settings = writable<ChatSettings>({
  temperature: 0.7,
  maxTokens: 1000,
  stream: true,
  responseAutoCopy: false,
  responseAutoPlayback: false,
  notificationEnabled: false,
  scrollOnBranchChange: true
});

// Message store
export const messages = writable<Record<string, Message>>({});

// Subscribe to message updates
messages.subscribe(($messages) => {
  if ($messages[currentMessageId]) {
    // Handle message update
    updateUI($messages[currentMessageId]);
  }
});
```

### Additional Core Stores
```typescript
// Application configuration
export const config = writable<ConfigState>({
    webui_name: WEBUI_NAME,
    model_download_pool: MODEL_DOWNLOAD_POOL,
    usage_pool: USAGE_POOL
});

// User state
export const user = writable<UserState>({
    isAuthenticated: false,
    profile: null,
    preferences: {}
});

// Mobile state
export const mobile = writable<boolean>(false);

// WebSocket connection
export const socket = writable<WebSocketState>({
    connected: false,
    error: null
});

// Active user count
export const activeUserCount = writable<number>(0);

// Theme settings
export const theme = writable<ThemeState>({
    mode: 'light',
    accent: 'blue'
});

// Available models
export const models = writable<ModelState[]>([]);

// Application settings
export const appSettings = writable<AppSettings>(defaultSettings);
```

## Derived Stores

### Document Derived Stores
```typescript
// Document status
export const documentStatus = derived(
    activeDocument,
    $doc => ({
        isEditable: $doc.metadata?.owner === currentUser.id,
        hasUnsavedChanges: $doc.isDirty,
        lastSaveTime: $doc.lastSaved,
        canShare: $doc.metadata?.is_public || $doc.metadata?.owner === currentUser.id
    })
);

// Document participants
export const activeParticipants = derived(
    [activeDocument, documentParticipants],
    ([$doc, $participants]) => $participants.get($doc.metadata?.id ?? '') ?? new Set()
);
```

### Folder Derived Stores
```typescript
// Folder hierarchy
export const folderHierarchy = derived(
    folderStore,
    $folders => {
        const hierarchy: Record<string, FolderItem[]> = {};
        Object.values($folders.items).forEach(folder => {
            if (!hierarchy[folder.parent_id ?? 'root']) {
                hierarchy[folder.parent_id ?? 'root'] = [];
            }
            hierarchy[folder.parent_id ?? 'root'].push(folder);
        });
        return hierarchy;
    }
);
```

### Chat Derived Stores
```typescript
// Filtered messages
export const filteredMessages = derived(
    chatState,
    $state => Object.values($state.history.messages)
        .filter(m => m.role !== 'assistant' || m.done)
        .filter(m => !m.isError)
);

// Chat thread
export const chatThread = derived(
    chatState,
    $state => buildMessageThread($state.history.messages, $state.history.currentId)
);
```

## Store Interactions

### Store Dependencies
```typescript
// Theme depends on user preferences
theme.subscribe($user => {
    if ($user.preferences.theme) {
        theme.set($user.preferences.theme);
    }
});

// Active user count depends on socket
socket.subscribe($socket => {
    if ($socket.connected) {
        fetchActiveUsers().then(count => activeUserCount.set(count));
    }
});

// Models depend on config
config.subscribe($config => {
    if ($config.model_download_pool) {
        fetchAvailableModels().then(modelList => models.set(modelList));
    }
});
```

## Store Subscriptions

### Document Subscriptions
```typescript
// Auto-save subscription
activeDocument.subscribe($doc => {
    if ($doc.isDirty && !$doc.loading) {
        debounce(() => saveDocument($doc), 2000);
    }
});

// Real-time sync subscription
documentChanges.subscribe($changes => {
    if ($changes.size > 0) {
        syncChangesToServer($changes);
    }
});
```

### Folder Subscriptions
```typescript
// Folder update subscription
folderStore.subscribe($folders => {
    if ($folders.loading) {
        // Handle loading state
    } else if ($folders.error) {
        // Handle error state
    } else {
        // Handle updated folder state
    }
});
```

### Chat Subscriptions
```typescript
// Message completion subscription
chatState.subscribe($state => {
    const currentMessage = $state.history.messages[$state.history.currentId ?? ''];
    if (currentMessage?.done) {
        processMessageCompletion(currentMessage);
    }
});
```

## Store Updates

### Atomic Updates
```typescript
const updateMessage = (id: string, content: string) => {
  messages.update(msgs => ({
    ...msgs,
    [id]: {
      ...msgs[id],
      content,
      updated: new Date()
    }
  }));
};
```

### Batch Updates
```typescript
const batchUpdate = (updates: Partial<ChatStore>) => {
  chatStore.update(store => ({
    ...store,
    ...updates,
    updated: new Date()
  }));
};
```

### Selective Subscriptions
```typescript
const unsubscribe = chatStore.subscribe(
  ({ currentChat }) => {
    if (currentChat?.id === activeChatId) {
      updateUI(currentChat);
    }
  }
);
```

## Best Practices

1. Store Updates
   - Use atomic updates
   - Batch related changes
   - Avoid nested subscriptions

2. State Management
   - Keep stores focused and minimal
   - Use derived stores for computed values
   - Implement proper cleanup in subscriptions

3. Type Safety
   - Define clear interfaces
   - Use strict type checking
   - Document state mutations

For more details about specific features:
- Chat system: See [chat.md](../features/chat.md)
- Collaboration: See [collaboration.md](../features/collaboration.md)
- Real-time sync: See [streaming.md](./streaming.md)
