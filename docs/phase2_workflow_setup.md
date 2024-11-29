# Phase 2: Workflow Configuration

## Summary
This phase focuses on updating and configuring the CI/CD workflows to match the new branch structure. It ensures all automated tests and builds trigger on the appropriate branches.

## Prerequisites Checklist
- [x] Phase 1 completed successfully
- [x] GitHub admin access available
- [x] CI/CD environment variables configured
- [x] Team notified of workflow changes

## 1. Update Existing Workflows

### Integration Test (integration-test.yml)
- [x] Backup created via workflow-backup branch
- [x] Updated trigger configuration:
  ```yaml
  on:
    push:
      branches:
        - dev
        - test
    pull_request:
      branches:
        - test
        - main
  ```
- [x] Updated to use Docker test environment:
  ```yaml
  jobs:
    cypress-run:
      runs-on: ubuntu-latest
      steps:
        # ... setup steps ...
        - name: Build and run Test Stack
          run: docker compose -f docker-compose.test.yaml up --detach --build
        - name: Run Cypress Tests
          run: docker compose -f docker-compose.test.yaml run --rm whatever-cypress
  ```
- [x] Status: Successfully updated and tested

### Backend Format (format-backend.yaml)
- [x] Backup created via workflow-backup branch
- [x] Updated trigger configuration:
  ```yaml
  on:
    push:
      branches:
        - dev
        - dev/**
    pull_request:
      branches:
        - test
        - main
  ```
- [x] Status: Successfully updated

### Frontend Build (format-build-frontend.yaml)
- [x] Backup created via workflow-backup branch
- [x] Updated trigger configuration:
  ```yaml
  on:
    push:
      branches:
        - dev
        - dev/**
    pull_request:
      branches:
        - test
        - main
  ```
- [x] Status: Successfully updated

## 2. Create New Workflow

### Deployment Approval (deployment-approval.yml)
- [x] Created new workflow file with configuration:
  ```yaml
  name: Deployment Approval
  on:
    pull_request:
      branches:
        - main
  jobs:
    approval:
      runs-on: ubuntu-latest
      environment: production
      steps:
        - name: Checkout Repository
          uses: actions/checkout@v4
        - name: Pending Approval
          uses: softprops/action-gh-release@v1
          with:
            draft: true
        - name: Deployment Gate
          run: |
            echo "Deployment requires manual approval"
            echo "Please review the changes carefully"
  ```
- [x] Status: Successfully created

## 3. Environment Configuration
- [ ] Set up GitHub environments:
  - Development (dev)
    - Auto-deploy enabled
    - No approval required
  - Testing (test)
    - Auto-deploy enabled
    - Requires one reviewer
  - Production (main)
    - Manual deployment
    - Requires two reviewers
- [ ] Configure environment secrets:
  - WEBUI_SECRET_KEY
  - OLLAMA_BASE_URL
  - Additional environment-specific variables
- [ ] Set up deployment approvers per environment

## Success Criteria
- [x] All workflows trigger on correct branches
- [x] Integration tests run on dev and test branches
- [x] Format checks run on dev branches
- [x] Build processes complete successfully
- [ ] Deployment approval workflow creates drafts (pending test)

## Verification Steps
1. Create test feature branch:
   ```bash
   git checkout -b dev/test-feature dev
   ```
2. Make test commit and push
3. Verify workflow triggers
4. Create test PR to test branch
5. Verify all checks run

## Document Management
### Version Control
- This document should be maintained in the `docs` directory
- Follow the established branch hierarchy for updates:
  1. Initial changes in `dev`
  2. Validation in `test`
  3. Final approval in `main`
- All document versions should be consistent with their respective workflow configurations

### Branch Navigation
- Document state per branch:
  - `main`: Production-ready documentation
  - `test`: Documentation being validated
  - `dev`: Latest documentation updates
- When switching branches:
  ```bash
  # Before switching
  git status  # Ensure clean working directory
  
  # Switch and update
  git checkout [branch]
  git pull origin [branch]
  ```
- Commit message format: "docs: update phase2_workflow_setup.md - [change summary]"

### Workflow Configuration Sync
- Document must stay synchronized with workflow files
- When updating workflows:
  1. Update workflow file
  2. Update corresponding documentation section
  3. Commit both changes together
  4. Use commit message: "chore: update workflow and docs for [workflow name]"

### Conflict Resolution
- For document conflicts:
  1. Compare workflow configurations in each version
  2. Ensure documentation matches actual workflow setup
  3. Merge while maintaining accuracy with current workflows
  4. Test documentation against actual setup
  5. Record resolution in version history

### Version History
| Version | Date | Branch | Changes | Author |
|---------|------|---------|----------|---------|
| 1.0.0   | [Current Date] | main | Initial document creation | [Your Name] |
| 1.1.0   | [Current Date] | workflow-backup | Updated with implementation results | [Your Name] |
| 1.2.0   | [Current Date] | dev | Updated Phase 2 documentation to reflect Docker-based test workflow changes | [Your Name] |

## Next Steps
Workflow configurations updated
Need to complete environment setup
Proceed to Phase 3: Branch Protection Setup once environments are configured
