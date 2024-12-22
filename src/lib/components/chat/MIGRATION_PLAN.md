# Prototyper Component Migration Plan

## Overview
Migrating functionality from Prototyper.svelte to TypeScript service and store files for better organization and maintainability.

## Current State Analysis

### Component Structure
```
Prototyper.svelte
├─ Local State
│  ├─ selectedModels
│  ├─ chat
│  ├─ history
│  └─ UI state (stopResponseFlag, autoScroll, etc.)
├─ Lifecycle Methods
│  ├─ onMount
│  └─ onDestroy
└─ Event Handlers
   ├─ Message handlers
   ├─ Chat handlers
   └─ UI handlers
```

### Store/Service Split
```
prototyperStore.ts (State Management)
├─ Global State
│  ├─ history
│  ├─ state
│  └─ selectedModels
└─ Chat State Operations
   ├─ initNewChat
   ├─ loadChat
   └─ saveChatHandler

prototyperService.ts (Business Logic)
├─ Chat Operations
│  ├─ sendPrompt
│  ├─ sendPromptOllama
│  └─ sendPromptOpenAI
└─ Event Handling
   ├─ chatEventHandler
   └─ chatCompletedHandler
```

## Issues to Fix

1. **Circular Dependencies**
   - Remove circular import between store and service
   - Move all API calls to service
   - Keep only state in store

2. **State Management**
   - Move chat-related state to store
   - Keep UI-related state in component
   - Properly initialize and cleanup subscriptions

3. **Function Organization**
   - Move all API calls to service
   - Move state updates to store
   - Keep event handling in component

4. **API Integration**
   - Fix OpenAI API endpoint 404 errors
   - Fix model validation and selection
   - Ensure proper message submission flow

## Implementation Plan

### Phase 1: Fix Dependencies
1. Remove circular imports
2. Reorganize function locations
3. Clean up imports

### Phase 2: State Management
1. Define clear state boundaries
2. Implement proper store subscriptions
3. Add proper cleanup

### Phase 3: Component Cleanup
1. Remove duplicate functions
2. Implement proper error handling
3. Add proper types

### Phase 4: API Integration
1. Fix OpenAI API endpoint configuration
2. Implement proper model validation like Chat.svelte
3. Ensure proper message flow and error handling

## Immediate Tasks

1. Fix chatIdUnsubscriber
   ```typescript
   let chatIdUnsubscriber: () => void;
   
   onMount(() => {
     chatIdUnsubscriber = chatId.subscribe(async (value) => {
       if (!value) {
         await initNewChat();
       }
     });
   });
   
   onDestroy(() => {
     chatIdUnsubscriber?.();
   });
   ```

2. Move API calls to service
   - Move initNewChat to service
   - Move loadChat to service
   - Move saveChatHandler to service

3. Clean up store
   - Remove API calls
   - Keep only state management
   - Remove service import

4. Fix API Integration
   - Verify OPENAI_API_BASE_URL configuration
   - Fix model validation in submitPrompt
   - Ensure proper error handling

## Testing Plan

1. Chat Initialization
   - Test new chat creation
   - Test chat loading
   - Test error handling

2. Message Handling
   - Test message sending
   - Test response handling
   - Test error cases

3. State Management
   - Test store subscriptions
   - Test state updates
   - Test cleanup

4. API Integration
   - Test OpenAI API connectivity
   - Test model selection and validation
   - Test error handling and recovery

## Progress

### Completed
1. Created initial service and store files
2. Identified correct architecture pattern from Chat.svelte
3. Started refactoring to match Chat.svelte pattern

### In Progress
1. Fixing API integration issues:
   - OpenAI API endpoint configuration
   - Model validation and selection
   - Message submission flow

### To Do
1. Implement proper TypeScript types
2. Add comprehensive error handling
3. Test and validate all changes
4. Document API integration requirements
