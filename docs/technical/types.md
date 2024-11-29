# TypeScript Type Definitions

This document contains the core type definitions used throughout the application. For implementation details of specific features, see:
- [Streaming Implementation](streaming.md)
- [Store Management](stores.md)

## Core Types

### Chat Types
```typescript
interface Message {
  id: string;
  parentId: string;
  content: string;
  model: string;
  selectedModelId?: string;
  done: boolean;
  error?: {
    content: string;
  };
  info?: {
    eval_count?: number;
    eval_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    total_duration?: number;
  };
  timestamp: number;
  childrenIds: string[];
  annotation?: {
    rating?: number;
    tags?: string[];
  };
}

interface MessageHistory {
  messages: Record<string, Message>;
  currentId: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  models: Model[];
  settings: ChatSettings;
  created: Date;
  updated: Date;
  tags?: ChatTag[];
  shared?: boolean;
  temporary?: boolean;
  folder_id?: string;
}

interface ChatSettings {
  temperature: number;
  maxTokens: number;
  stream: boolean;
  responseAutoCopy?: boolean;
  responseAutoPlayback?: boolean;
  notificationEnabled?: boolean;
  scrollOnBranchChange?: boolean;
}

interface ChatPermissions {
  read: boolean;
  write: boolean;
  share: boolean;
  export: boolean;
  delete: boolean;
}
```

### API Types
```typescript
interface StreamResponse {
  choices?: [{
    delta: {
      content?: string;
    };
  }];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    detail?: string;
    error?: string;
  };
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface PaginatedResponse<T> extends ApiResponse<T> {
  page: number;
  totalPages: number;
  totalItems: number;
}

interface ErrorResponse {
  error: string;
  code: number;
  details?: unknown;
}
```

### Event Types
```typescript
interface ChatEvent extends CustomEvent {
  detail: {
    id: string;
    content: string;
  };
}

interface ChatFinishEvent extends CustomEvent {
  detail: {
    id: string;
    content: string;
  };
}
```

### Store Types
```typescript
interface Store<T> {
  subscribe: (callback: (value: T) => void) => () => void;
  set: (value: T) => void;
  update: (updater: (value: T) => T) => void;
}

interface Writable<T> extends Store<T> {
  set: (value: T) => void;
}

interface Readable<T> extends Store<T> {
  subscribe: (callback: (value: T) => void) => () => void;
}

interface ChatStore {
  chats: Chat[];
  currentChat?: Chat;
  selectedModels: Model[];
  settings: ChatSettings;
  error?: Error;
}
```

### Utility Types
```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type Nullable<T> = T | null;

type AsyncResult<T> = Promise<Result<T, Error>>;

interface Result<T, E> {
  success: boolean;
  data?: T;
  error?: E;
}
