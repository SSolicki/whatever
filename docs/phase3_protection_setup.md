# Phase 3: Branch Protection Setup

## Summary
This phase implements branch protection rules and code ownership requirements to enforce the new branching strategy and ensure code quality through required reviews and checks.

## Prerequisites Checklist
- [ ] Phase 1 and 2 completed successfully
- [ ] GitHub admin access available
- [ ] All workflows functioning correctly
- [ ] Team leads identified for code ownership
- [ ] Review processes documented

## 1. Create CODEOWNERS File
- [ ] Create .github/CODEOWNERS:
  ```
  # Default owners for everything
  *       @team-leads

  # Backend specific
  /backend/ @backend-team-lead

  # Frontend specific
  /frontend/ @frontend-team-lead

  # Workflow files
  /.github/workflows/ @devops-lead

  # Documentation
  /docs/ @tech-docs-team
  ```

## 2. Configure Branch Protection

### Dev Branch Protection
- [ ] Enable branch protection:
  ```
  Settings → Branches → Add rule
  Branch name pattern: dev
  ```
- [ ] Configure rules:
  - Required status checks:
    - [ ] Format Backend
    - [ ] Frontend Build
    - [ ] Integration Test
  - [ ] Include administrators
  - [ ] Allow force pushes (temporary)

### Test Branch Protection
- [ ] Enable branch protection:
  ```
  Settings → Branches → Add rule
  Branch name pattern: test
  ```
- [ ] Configure rules:
  - Required status checks:
    - [ ] Integration Test
    - [ ] Format Backend
    - [ ] Frontend Build
  - [ ] Require pull request reviews
  - [ ] Require approval from code owners
  - [ ] Include administrators
  - [ ] No force push allowed

### Main Branch Protection
- [ ] Enable branch protection:
  ```
  Settings → Branches → Add rule
  Branch name pattern: main
  ```
- [ ] Configure rules:
  - [ ] Require pull request reviews
  - [ ] Require approval from code owners
  - [ ] Require status checks
  - [ ] Require deployment approval
  - [ ] Include administrators
  - [ ] No force push allowed

## 3. Configure Review Settings
- [ ] Set required number of reviewers
- [ ] Configure review assignment rules
- [ ] Set up review reminders
- [ ] Configure stale review dismissal

## Success Criteria
- [ ] Protection rules prevent direct pushes
- [ ] Required reviews enforced
- [ ] Status checks must pass
- [ ] CODEOWNERS file working correctly
- [ ] Force push restrictions active

## Verification Steps
1. Test Dev Branch Protection:
   - [ ] Try direct push to dev
   - [ ] Create PR without tests passing
   - [ ] Create PR with passing tests

2. Test Test Branch Protection:
   - [ ] Try direct push to test
   - [ ] Create PR without reviews
   - [ ] Create PR with proper reviews

3. Test Main Branch Protection:
   - [ ] Try direct push to main
   - [ ] Create PR without approval
   - [ ] Create PR with all requirements met

## Rollback Instructions
1. Disable branch protection rules:
   ```
   Settings → Branches → Edit rule → Delete
   ```
2. Restore previous protection settings if needed
3. Document any changes in version history

## Document Management
### Version Control
- This document should be maintained in the `docs` directory
- Follow the branch hierarchy for updates:
  1. Initial changes in `dev`
  2. Validation in `test`
  3. Final approval in `main`

### Branch Navigation
- Document state per branch:
  - `main`: Approved protection rules
  - `test`: Rules being validated
  - `dev`: Latest protection updates
- When switching branches:
  ```bash
  git checkout [branch]
  git pull origin [branch]
  ```
- Commit message format: "docs: update phase3_protection_setup.md - [change summary]"

### Protection Rule Sync
- Document must stay synchronized with actual GitHub settings
- When updating protection rules:
  1. Update GitHub settings
  2. Update documentation
  3. Verify changes
  4. Commit with message: "chore: update protection rules and docs for [branch]"

### Conflict Resolution
- For document conflicts:
  1. Compare with actual GitHub settings
  2. Maintain accuracy with current rules
  3. Document any rule changes
  4. Update version history

### Version History
| Version | Date | Branch | Changes | Author |
|---------|------|---------|----------|---------|
| 1.0.0   | [Current Date] | main | Initial document creation | [Your Name] |

## Final Notes
- Protection rules should be regularly audited
- Keep team informed of any changes
- Document any exceptions or special cases
- Regular review of access permissions
