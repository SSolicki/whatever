# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New `chat/Sidebar` directory for improved component organization
- Feature-based component structure
- Comprehensive component documentation
- Drag-and-drop overlay management
- Enhanced error handling system

### Fixed
- FileHandler show/dragged prop inconsistency
- Missing onDestroy cleanup in VoiceHandler
- Sidebar overlap issues on mobile devices
- Focus management in nested menus
- Z-index hierarchy conflicts
- Chat initialization issues in `/c` route
- Incorrect sidebar store method usage
- Chat list API parameter handling

### Changed
- Restructured project documentation for clarity
- Updated component import paths
- Removed redundant `activeSection` from sidebar store
- Enhanced sidebar width management
- Improved TypeScript type definitions
- Simplified sidebar store interface
- Standardized store value access patterns

### Removed
- Unused `setActive` method from sidebar store
- Redundant chat list pagination parameter

## [1.1.1] - 2024-01-10

### Added
- Debug logging system for message submission
- Message sending prerequisites validation
- Detailed troubleshooting documentation

### Fixed
- Message submission error handling
- Processing state management
- Model selection validation
- API token validation

## [1.1.0] - 2024-01-10

### Added
- Two-sidebar architecture implementation
- Comprehensive test suite for chat functionality
- Mobile-responsive design system
- State management architecture

### Enhanced
- OpenAI service error handling
- Streaming response management
- Test environment configuration
- Token validation system

### Fixed
- Environment variable handling
- Streaming response edge cases
- Sidebar responsive behavior
- Focus and accessibility management

## [1.0.0] - 2024-01-09

### Added
- Initial release
- Backend API documentation
- Frontend development guide
- Chat component system
- API client implementation

### Changed
- Consolidated authentication system
- Streamlined documentation structure

For detailed information about specific components or features, please refer to:
- [chat.md](./chat.md) - Chat system implementation
- [navigation.md](./navigation.md) - Navigation and sidebar architecture
- [streaming.md](./streaming.md) - Message streaming implementation
