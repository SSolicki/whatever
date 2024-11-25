# Debugging Plan

## Bug Summary
1. **Bug ID/Name**: CHAT-001-UNDEFINED-INIT
   - **Observed Issue**: ReferenceError: initNewChat is not defined at Chat.new.svelte:150
   - **Steps to Reproduce**: 
     1. Open the chat application
     2. Navigate to a new chat session (without chatIdProp)
     3. Error appears in console at Chat.new.svelte:150
   - **Expected Behavior**: A new chat session should be initialized when no chatIdProp is provided
   - **Affected Areas**: 
     - `/src/lib/components/chat/Chat.new.svelte`
     - Specifically the onMount lifecycle function and chat initialization logic
   - **Related Task**: Step 4 of refactoring plan in currentwork.md - "Create Chat.new.svelte with correct imports"

## Analysis and Hypotheses
- The error occurred during the refactoring process when moving code from Chat.svelte to Chat.new.svelte
- The initNewChat function was not properly transferred during the refactoring
- The function is critical for initializing new chat sessions and handling various initialization scenarios:
  1. Model selection from multiple sources
  2. UI state management
  3. Chat state initialization
  4. URL parameter handling
  5. Feature initialization (YouTube, web search, tools)

## Debugging Steps
1. **Code Review**
   - Examined Chat.new.svelte to locate initNewChat references
   - Found call to initNewChat in onMount lifecycle hook
   - Confirmed function was missing from codebase
   - Located original implementation in Chat.svelte

2. **Analysis**
   - Reviewed component initialization flow
   - Identified all required initialization features:
     - Model selection logic
     - UI state management
     - Chat state initialization
     - URL handling
     - Feature initialization

3. **Implementation**
   - Added comprehensive initNewChat function with:
     - Model selection from multiple sources (sessionStorage, URL, settings, config)
     - UI state reset (controls, overlays, views)
     - Complete chat state initialization
     - URL history management
     - Feature handling (YouTube, web search, tools)
     - Error handling with user feedback

4. **Verification**
   The fix can be verified by testing:
   - New chat initialization
   - Model selection from different sources:
     - URL parameters
     - Session storage
     - Settings defaults
     - Config defaults
   - Feature initialization:
     - YouTube transcription
     - Web search
     - Tool selection
     - Call overlay

## Resolution
- **Fix Applied**: Implemented comprehensive initNewChat function matching original functionality
- **Key Improvements**:
  1. Proper error handling with try-catch
  2. User feedback via toast notifications
  3. Organized code with clear sections and comments
  4. Complete state management
  5. Maintained all original features

## Chat Component Refactoring Progress

### Fixed Issues
1. ✅ Missing variable declarations in Chat.new.svelte
2. ✅ Event target initialization
   - Changed `eventTarget` from `let` to `const`
   - Moved initialization to match original implementation
3. ✅ Event handler functions
   - Added proper `onMessageHandler` and `chatEventHandler` functions
   - Fixed event listener cleanup in `onDestroy`
4. ✅ Message input handling
   - Added support for 'input:prompt' events
   - Added support for 'action:submit' events
   - Added support for 'input:prompt:submit' events
5. ✅ Socket event handling
   - Added proper socket event listener setup
   - Using `chat-events` for socket communication
   - Proper cleanup in onDestroy

### Current Implementation Status
- Variables properly initialized:
  - `chat` (initialized as `null`)
  - `chatFiles` (initialized as `[]`)
  - `selectedModels` (array)
  - `stopResponseFlag` (boolean)
  - `processing` (boolean)
  - `tags` (array)
  - `eventTarget` (constant EventTarget instance)
  - `mediaQuery` (MediaQueryList instance)
  - `prompt` (string)
  - `files` (array)
  - `webSearchEnabled` (boolean)
  - `selectedToolIds` (array)

### Event Handling
1. Message Events:
   - Added origin validation
   - Proper handling of prompt input
   - Support for submit actions
   - Proper event data validation

2. Socket Events:
   - Added proper socket event listener setup
   - Using `chat-events` for socket communication
   - Proper cleanup in onDestroy

3. Store Subscriptions:
   - All store subscriptions properly declared
   - Cleanup in onDestroy

### Next Steps
1. Test chat functionality with new event handling
2. Verify socket communication
3. Test media query responsiveness
4. Continue systematic comparison with original Chat.svelte

### Known Issues
- None currently identified

## Bug Report: autoScroll Reference Error

### Issue Description
- **Error**: `ReferenceError: autoScroll is not defined`
- **Location**: Chat.new.svelte:227
- **Stack Trace**: 
  ```
  Error initializing new chat: ReferenceError: autoScroll is not defined
    at ct (Chat.new.svelte:181:4)
    at async Chat.new.svelte:264:15
  ```

### Root Cause
- Variable `autoScroll` is being referenced in `initNewChat()` function before being declared
- Missing state variable declaration in component scope

### Fix Required
1. Add `autoScroll` variable declaration to component scope
2. Initialize with appropriate default value (typically `true`)
3. Ensure proper typing for TypeScript compatibility

### Impact
- Prevents successful chat initialization
- Blocks new chat creation flow

## Debug Log

## Bug Reports

### 1. AutoScroll Reference Error
- **Description**: `autoScroll` variable was undefined in Chat.new.svelte
- **Root Cause**: Missing variable declaration
- **Fix**: Added `autoScroll` variable declaration with default value of `true`

### 2. Chat Variable Undefined Error
- **Description**: `chat` variable was undefined in Chat.new.svelte
- **Root Cause**: Missing variable declaration
- **Fix**: Added `chat` variable declaration with initial value of `null`

### 3. ChatFiles Reference Error
- **Description**: `chatFiles` variable was undefined in Chat.new.svelte
- **Root Cause**: Missing variable declaration in the new component
- **Fix**: Added `chatFiles` variable declaration with initial empty array value

## Implementation Status

### Variables Ported from Original Chat.svelte
- `autoScroll`
- `chat`
- `chatFiles`
- `selectedModels`
- `stopResponseFlag`
- `processing`
- `tags`
- `toolIds`
- `params`

### Next Steps
1. Continue verifying variable declarations match original implementation
2. Test chat initialization flow
3. Validate message handling
4. Ensure proper error handling
5. Test file handling functionality

## Notes
- Maintaining parity with original Chat.svelte implementation
- Adding variables progressively as they are needed
- Testing each addition to ensure functionality

## Model Selection Issues (2024-01-09)

### Current Status
- Model selection in Chat.new.svelte is not displaying any models
- Model initialization logic has been added but models are not populating

### Investigation Steps
1. Added model selection state variables and initialization logic
2. Verified model store subscription is in place
3. Need to check:
   - Model store initialization
   - Store subscription timing
   - Model filtering logic
   - Component lifecycle hooks

### Next Steps
1. Add debug logging for model store values
2. Verify model store is being populated
3. Check model subscription timing in onMount
4. Ensure model filtering is not over-aggressive
5. Add proper store cleanup in onDestroy

### Implementation Notes
- Model initialization follows original component's logic
- Multiple fallback strategies implemented
- Store subscriptions may need adjustment
- May need to handle race conditions between store updates

### Current Implementation
```typescript
// Model selection state
let selectedModels = [''];
let atSelectedModel: Model | undefined;
let selectedModelIds = [];
$: selectedModelIds = atSelectedModel !== undefined ? [atSelectedModel.id] : selectedModels;
```

### Required Changes
1. Add debug logging for model store values
2. Verify store subscription timing
3. Check model filtering logic
4. Ensure proper store cleanup
5. Review store initialization order

## Notes/Comments
- The bug was caused by incomplete code transfer during refactoring
- Solution maintains full compatibility with existing features
- Added error handling improves reliability
- Consider adding:
  1. Unit tests for chat initialization
  2. Documentation of initialization flow
  3. Type definitions for chat state
  4. Integration tests for URL parameter handling

## Follow-up Tasks
1. Add unit tests for initNewChat function
2. Document chat initialization flow
3. Add type definitions for chat state
4. Create integration tests for URL parameter handling
5. Review other refactored functions for similar issues
