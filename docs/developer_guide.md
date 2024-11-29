# Developer Guide

## Overview
This guide explains how to work with our development workflow, including branch structure, automated processes, and best practices.

## Branch Structure
```
main (production)
  ↑
test (integration)
  ↑
dev (development)
  ↑
feature/* or bugfix/* (feature branches)
```

### Branch Purposes
- `main`: Production-ready code
- `test`: Integration and testing
- `dev`: Active development
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `sync/upstream`: Upstream synchronization

## Development Workflow

### 1. Starting New Work

#### For Features
```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your changes...
git add .
git commit -m "feat: your descriptive message"
git push -u origin feature/your-feature-name
```

#### For Bug Fixes
```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create bugfix branch
git checkout -b bugfix/issue-description
git push -u origin bugfix/issue-description
```

### 2. Working with Docker

#### Development Environment
```bash
# Start development environment
docker compose -f docker-compose.dev.yaml up -d

# View logs
docker compose -f docker-compose.dev.yaml logs -f

# Stop environment
docker compose -f docker-compose.dev.yaml down
```

#### Running Tests
```bash
# Run integration tests
docker compose -f docker-compose.test.yaml up -d
docker compose -f docker-compose.test.yaml run --rm whatever-cypress

# Clean up
docker compose -f docker-compose.test.yaml down -v
```

### 3. Automated Workflows

#### Integration Tests
- Triggers: 
  - Push to `dev` and `test`
  - PRs to `test` and `main`
- Actions:
  - Builds Docker environment
  - Runs Cypress tests
  - Reports results

#### Format Checks
- Triggers:
  - Push to `dev` and `dev/**`
  - PRs to `test` and `main`
- Actions:
  - Backend format verification
  - Frontend build check

#### Deployment Approval
- Triggers:
  - PRs to `main`
- Actions:
  - Creates draft release
  - Requires manual approval

### 4. Making Pull Requests

#### To Dev Branch
1. Create PR from your feature branch to `dev`
2. Ensure all checks pass:
   - Format checks
   - Build verification
   - Integration tests
3. Address review comments
4. Merge when approved

#### To Test Branch
1. Create PR from `dev` to `test`
2. Requires:
   - All checks passing
   - One reviewer approval
   - No unresolved conversations
3. Merge when ready for testing

#### To Main Branch
1. Create PR from `test` to `main`
2. Requires:
   - All checks passing
   - Two reviewer approvals
   - Deployment approval
   - No unresolved conversations
3. Merge for production deployment

### 5. Code Review Process

#### As Author
1. Create detailed PR description
2. Link relevant issues/tickets
3. Highlight significant changes
4. Respond to reviews promptly
5. Keep PR size manageable

#### As Reviewer
1. Check code style and standards
2. Verify test coverage
3. Review Docker configurations
4. Test locally if needed
5. Provide constructive feedback

### 6. Working with Upstream Changes

#### Automated Sync
- Daily sync at midnight
- Creates PR from `sync/upstream` to `dev`
- Review and merge carefully

#### Manual Sync
```bash
# Trigger workflow manually
gh workflow run upstream-sync.yml

# Or sync locally
git checkout sync/upstream
git pull origin sync/upstream
git fetch upstream
git merge upstream/main
git push origin sync/upstream
```

## Best Practices

### Commits
- Use conventional commit messages:
  - `feat:` for features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `chore:` for maintenance
  - `test:` for testing changes
  - `refactor:` for code refactoring

### Branch Naming
- Features: `feature/descriptive-name`
- Bug fixes: `bugfix/issue-description`
- Always use lowercase and hyphens

### Docker
- Always test in Docker environment
- Keep images updated
- Clean up unused containers/volumes

### Testing
- Write tests for new features
- Update tests for bug fixes
- Run full test suite locally before PR

### Documentation
- Update relevant documentation
- Include code comments
- Document environment changes

## Troubleshooting

### Common Issues

#### Failed Workflows
1. Check workflow logs in GitHub Actions
2. Verify Docker environment
3. Run tests locally
4. Check branch protection rules

#### Merge Conflicts
1. Pull latest changes
2. Resolve conflicts locally
3. Test after resolution
4. Push resolved changes

#### Docker Issues
1. Clean Docker environment:
   ```bash
   docker compose down -v
   docker system prune -f
   ```
2. Rebuild images:
   ```bash
   docker compose build --no-cache
   ```

### Getting Help
1. Check documentation
2. Review workflow logs
3. Ask team leads
4. Create issue if needed

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0.0   | [Current Date] | Initial guide creation | [Your Name] |
