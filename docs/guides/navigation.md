# Navigation System Documentation
_Version: 1.2.0_
_Last Updated: 2024-02-21_

## Overview
The application uses a three-panel architecture:
1. **AppSidebar**: Main application navigation (60px fixed width)
2. **ChatSidebar**: Chat management and model selection (15-30% adjustable width)
3. **Main Content**: Primary interaction area (remaining width)

## Navigation Architecture

The application implements a flexible multi-panel system:

### AppSidebar
- Primary application navigation
- Fixed 60px width
- Always visible on desktop
- Collapsible on mobile
- Contains app-level navigation icons

### ChatSidebar
- Chat management and model selection interface
- Width: 15-30% of viewport (resizable)
- Appears right of AppSidebar
- Features:
  - Model selection interface
  - Chat history management
  - Folder organization
  - Responsive design with mobile optimizations
- User-adjustable width with drag handles
- Collapsible on mobile

## Component Structure

```
src/lib/components/
├── layout/
│   ├── AppSidebar/            # Main app navigation
│   │   ├── AppSidebar.svelte  # Primary navigation sidebar
│   │   └── NavItem.svelte     # Navigation item component
│   └── shared/
│       └── stores/
│           └── sidebar.ts      # Sidebar state management
└── chat/
    ├── ModelSelector/          # Model selection components
    │   └── Selector.svelte    # Model selection interface
    └── Sidebar/               # Chat management components
        ├── ChatSidebar.svelte # Chat and model management
        ├── ChatItem.svelte    # Individual chat item
        └── ChatMenu.svelte    # Chat actions menu
```

## State Management

### Sidebar Store Interface
```typescript
interface SidebarState {
    isMobile: boolean;    // Mobile view state
    isVisible: boolean;   // Sidebar visibility
    width: number;       // Current width (15-30% of viewport)
}

// Available Methods
sidebarStore.show()      // Show the sidebar
sidebarStore.hide()      // Hide the sidebar
sidebarStore.toggle()    // Toggle visibility
sidebarStore.setMobile() // Update mobile state
sidebarStore.reset()     // Reset to defaults
```

### Mobile Behavior
The sidebar implements responsive behavior:
- Automatically detects mobile viewport (< 768px)
- Adjusts width based on device (15-30% of viewport)
- Collapses by default on mobile
- Shows/hides via toggle button
- Maintains state across route changes

### Width Management
Width is managed automatically:
```typescript
width = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;  // 15-30% of viewport
```

### Event Handling
The sidebar responds to:
- Window resize events
- Route changes
- User toggle actions
- Mobile breakpoint changes

## Responsive Design
```typescript
// AppSidebar mobile handling
const MOBILE_BREAKPOINT = 768;
const APP_SIDEBAR_WIDTH = 60;

// ChatSidebar responsive widths
const DESKTOP_WIDTH = 30; // 30% of viewport
const MOBILE_WIDTH = 15; // 15% of viewport
```

## Authentication
- Role-based navigation
- Protected routes
- Auth state awareness

See [auth.md](./auth.md) for details.

## Best Practices

### 1. Store Usage
```typescript
// Good
sidebarStore.show();
sidebarStore.hide();

// Bad
sidebarStore.setActive();  // Method doesn't exist
```

### 2. Width Management
```typescript
// Good - Let store handle width
sidebarStore.setMobile(window.innerWidth < 768);

// Bad - Manual width setting
sidebarStore.width = 300;
```

### 3. Visibility Control
```typescript
// Good
sidebarStore.toggle();

// Bad
sidebarStore.update(s => ({ ...s, isVisible: !s.isVisible }));
```

## Related Documentation
- [chat.md](./chat.md) - Chat system implementation
- [stores.md](./stores.md) - State management details
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Accessibility guidelines
