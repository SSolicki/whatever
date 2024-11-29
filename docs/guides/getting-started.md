# Getting Started Guide

This guide will help you set up and run the project locally.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (v14 or higher)
- Git

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/project.git
   cd project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   WEBSOCKET_URL=ws://localhost:3000
   API_KEY=your_api_key
   ```

4. Initialize the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to see the application running.

## Development Setup

### IDE Configuration

We recommend using VS Code with these extensions:
- Svelte for VS Code
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

### Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb your_database_name
   ```

2. Run migrations:
   ```bash
   npm run db:migrate
   ```

3. (Optional) Seed test data:
   ```bash
   npm run db:seed
   ```

## Project Structure

```
src/
├── lib/            # Shared code
├── routes/         # SvelteKit routes
├── components/     # UI components
├── stores/         # State management
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Common Tasks

### Adding a New Feature
1. Create a new branch
2. Add tests
3. Implement feature
4. Update documentation
5. Submit PR

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test file
npm run test src/path/to/test.ts

# Run tests in watch mode
npm run test:watch
```

### Database Operations
```bash
# Create new migration
npm run db:migration:create

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   kill $(lsof -t -i:5173)
   ```

2. **Database connection failed**
   - Check PostgreSQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

3. **Build errors**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify import paths

## Next Steps

- Read the [Contributing Guide](../CONTRIBUTING.md)
- Explore the [API Documentation](../api/api-reference.md)
- Check out [Example Projects](../examples/)
- Join our [Community Chat](https://chat.example.com)

## Need Help?

- Check [FAQ](./FAQ.md)
- Visit [Troubleshooting Guide](./troubleshooting.md)
- Open an [Issue](https://github.com/yourusername/project/issues)
- Join our [Discord](https://discord.gg/example)
