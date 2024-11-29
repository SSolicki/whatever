# Phase 4: Upstream Synchronization Setup

## Summary
This phase establishes a structured process for synchronizing with the upstream repository (open-webui/open-webui) through a dedicated sync branch, ensuring clean integration of upstream changes into the local development workflow.

## Prerequisites Checklist
- [ ] Phases 1-3 completed successfully
- [ ] Upstream remote configured correctly
- [ ] GitHub admin access available
- [ ] Team notified of new sync process
- [ ] No pending local changes in main branches

## 1. Create Sync Branch Structure

### Initial Setup
- [ ] Create sync branch from main:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b sync/upstream
  git push -u origin sync/upstream
  ```

### Configure Upstream Remote
- [ ] Verify upstream remote:
  ```bash
  git remote -v
  ```
- [ ] Add upstream if not present:
  ```bash
  git remote add upstream https://github.com/open-webui/open-webui.git
  ```
- [ ] Fetch upstream branches:
  ```bash
  git fetch upstream
  ```

## 2. Create Sync Workflow

### Create Sync Automation (.github/workflows/upstream-sync.yml)
```yaml
name: Upstream Sync

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:      # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: sync/upstream

      - name: Configure Git
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'

      - name: Fetch Upstream
        run: |
          git remote add upstream https://github.com/open-webui/open-webui.git
          git fetch upstream

      - name: Sync Branch
        run: |
          git merge upstream/main --allow-unrelated-histories
          git push origin sync/upstream

      - name: Test Docker Build
        run: |
          docker compose -f docker-compose.test.yaml build
          docker compose -f docker-compose.test.yaml up -d
          docker compose -f docker-compose.test.yaml run --rm whatever-cypress
          docker compose -f docker-compose.test.yaml down -v

      - name: Create Pull Request
        if: success()
        uses: peter-evans/create-pull-request@v5
        with:
          branch: sync/upstream
          title: 'chore: sync with upstream'
          body: |
            Automated PR to sync with upstream repository.
            
            - All tests passing
            - Docker build verified
            
            Please review carefully before merging.
```

## 3. Configure Branch Protection

### Sync Branch Protection
- [ ] Enable branch protection:
  ```
  Settings → Branches → Add rule
  Branch name pattern: sync/upstream
  ```
- [ ] Configure rules:
  - [ ] Require status checks
  - [ ] Require pull request reviews
  - [ ] Allow force push for workflow
  - [ ] Include administrators

## 4. Update CODEOWNERS
- [ ] Add sync-specific ownership:
  ```
  # Upstream sync branch
  sync/upstream @devops-lead @tech-lead
  ```

## 5. Sync Process Documentation

### Normal Sync Flow
1. Automated daily sync:
   - Workflow fetches upstream changes
   - Creates PR from sync/upstream to dev
   - Team reviews changes

2. Manual sync process:
   ```bash
   git checkout sync/upstream
   git fetch upstream
   git merge upstream/main --no-edit
   git push origin sync/upstream
   ```

### Conflict Resolution Process
1. When conflicts occur:
   ```bash
   git checkout sync/upstream
   git fetch upstream
   git merge upstream/main
   # Resolve conflicts
   git add .
   git commit -m "chore: resolve upstream sync conflicts"
   git push origin sync/upstream
   ```

2. Create sync PR:
   - Base: dev
   - Compare: sync/upstream
   - Label: upstream-sync
   - Reviewers: devops-lead, tech-lead

## Success Criteria
- [ ] Sync branch created and protected
- [ ] Automated sync workflow functioning
- [ ] Manual sync process documented
- [ ] Conflict resolution process tested
- [ ] Team trained on new process

## Verification Steps
1. Test Automated Sync:
   - [ ] Trigger workflow manually
   - [ ] Verify PR creation
   - [ ] Check status checks

2. Test Manual Sync:
   - [ ] Follow manual sync process
   - [ ] Verify changes appear in PR
   - [ ] Test merge process

3. Test Conflict Resolution:
   - [ ] Create test conflict
   - [ ] Follow resolution process
   - [ ] Verify clean merge

## Rollback Instructions
1. Disable sync workflow:
   ```bash
   git checkout main
   git rm .github/workflows/upstream-sync.yml
   git commit -m "chore: disable upstream sync workflow"
   git push
   ```

2. Remove sync branch:
   ```bash
   git push origin --delete sync/upstream
   ```

3. Restore previous state:
   - Document any necessary manual syncs
   - Update team on temporary process

## Document Management
### Version Control
- This document should be maintained in the `docs` directory
- Follow the branch hierarchy for updates:
  1. Initial changes in `dev`
  2. Validation in `test`
  3. Final approval in `main`

### Branch Navigation
- Document state per branch:
  - `main`: Approved sync process
  - `test`: Process being validated
  - `dev`: Latest process updates
- When switching branches:
  ```bash
  git checkout [branch]
  git pull origin [branch]
  ```
- Commit message format: "docs: update phase4_upstream_sync.md - [change summary]"

### Sync Process Updates
- Document must stay synchronized with actual workflow
- When updating sync process:
  1. Update workflow file
  2. Update documentation
  3. Test process
  4. Update team documentation

### Conflict Resolution
- For document conflicts:
  1. Compare with actual workflow
  2. Maintain accuracy with current process
  3. Document any process changes
  4. Update version history

### Version History
| Version | Date | Branch | Changes | Author |
|---------|------|---------|----------|---------|
| 1.0.0   | [Current Date] | main | Initial document creation | [Your Name] |
| 1.1.0   | [Current Date] | main | Update Phase 4 documentation to include Docker considerations | [Your Name] |

## Final Notes
- Regular audit of sync process
- Monitor sync frequency needs
- Keep team updated on upstream changes
- Document any sync-related incidents

## Next Steps
- Schedule team training
- Set up sync monitoring
- Create sync status dashboard
- Regular process review meetings
