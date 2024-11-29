# Contributing Guide
_Version: 1.1.0_
_Last Updated: 2024-02-20_

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- pnpm (for frontend development)

### Development Environment Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   pnpm install
   
   # Backend
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Development Standards

### 1. Code Style
- Use TypeScript for frontend code
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/TypeScript
- Run linters before committing

### 2. Testing
We maintain comprehensive testing standards to ensure code quality. For detailed information about:
- Testing requirements and coverage thresholds
- Test running instructions
- Best practices and patterns
- Mocking and test environment setup

Please refer to our [TESTING.md](./TESTING.md) documentation.

### 3. Pull Request Process
1. Create a feature branch from main
2. Make your changes
3. Update relevant documentation
4. Run tests and linters
5. Submit PR with clear description
6. Address review feedback

## Documentation Guidelines

### File Organization
- Use clear, descriptive filenames
- Group related documentation together
- Include version numbers and last updated dates
- Cross-reference related documents

### Content Structure
- Start with a clear overview
- Use consistent heading hierarchy
- Include practical examples
- Document both usage and implementation

### Code Examples
- Use TypeScript for frontend examples
- Include type definitions
- Show both basic and advanced usage
- Provide error handling examples

### Maintenance
- Update documentation with code changes
- Review for accuracy quarterly
- Remove outdated information
- Keep examples current

## Documentation Structure

### 1. Core Documentation
- `README.md` - Project overview and quick start
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - This guide
- `TESTING.md` - Testing guidelines
- `development-guidelines.md` - Development standards

### 2. Architecture Documentation
- `frontend.md` - Frontend architecture
- `backend.md` - Backend services
- `stores.md` - State management
- `auth.md` - Authentication system

### 3. Component Documentation
- `chat.md` - Chat system
- `sidebars.md` - Navigation system
- `streaming.md` - Message streaming

### 4. Technical Specifications
- `apis.md` - API documentation
- `BUILD.md` - Build configuration
- `ACCESSIBILITY.md` - Accessibility guidelines

## Need Help?
- Check existing documentation
- Review open issues
- Ask in discussions
- Contact maintainers
