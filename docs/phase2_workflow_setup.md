# Phase 2: Workflow Configuration

## Summary
This phase focuses on updating and configuring the CI/CD workflows to match the new branch structure. It ensures all automated tests and builds trigger on the appropriate branches.

## Prerequisites Checklist
- [ ] Phase 1 completed successfully
- [ ] GitHub admin access available
- [ ] CI/CD environment variables configured
- [ ] Team notified of workflow changes

## 1. Update Existing Workflows

### Integration Test (integration-test.yml)
- [ ] Backup current workflow:
  ```bash
  cp .github/workflows/integration-test.yml .github/workflows/integration-test.yml.bak
  ```
- [ ] Update trigger configuration:
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

### Backend Format (format-backend.yaml)
- [ ] Backup current workflow:
  ```bash
  cp .github/workflows/format-backend.yaml .github/workflows/format-backend.yaml.bak
  ```
- [ ] Update trigger configuration:
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

### Frontend Build (format-build-frontend.yaml)
- [ ] Backup current workflow:
  ```bash
  cp .github/workflows/format-build-frontend.yaml .github/workflows/format-build-frontend.yaml.bak
  ```
- [ ] Update trigger configuration:
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

## 2. Create New Workflow

### Deployment Approval (deployment-approval.yml)
- [ ] Create new workflow file:
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
        - name: Pending Approval
          uses: softprops/action-gh-release@v1
          with:
            draft: true
  ```

## 3. Environment Configuration
- [ ] Set up GitHub environments:
  - Development (dev)
  - Testing (test)
  - Production (main)
- [ ] Configure environment variables per environment
- [ ] Set up deployment approvers

## Success Criteria
- [ ] All workflows trigger on correct branches
- [ ] Integration tests run on dev and test branches
- [ ] Format checks run on dev branches
- [ ] Build processes complete successfully
- [ ] Deployment approval workflow creates drafts

## Verification Steps
1. Create test feature branch:
   ```bash
   git checkout -b dev/test-feature dev
   ```
2. Make test commit and push
3. Verify workflow triggers
4. Create test PR to test branch
5. Verify all checks run

## Rollback Instructions
If issues occur:
1. Restore backup files:
   ```bash
   cp .github/workflows/*.bak .github/workflows/
   rm .github/workflows/*.bak
   ```
2. Commit and push changes:
   ```bash
   git add .github/workflows/
   git commit -m "revert: restore workflow configurations"
   git push
   ```

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

## Next Steps
Once all success criteria are met, proceed to Phase 3: Branch Protection Setup
