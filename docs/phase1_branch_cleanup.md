# Phase 1: Branch Cleanup and Restructuring

## Summary
This phase focuses on cleaning up existing branches and establishing the new branch hierarchy: main → test → dev. This phase must be completed before implementing new workflows and protection rules.

## Prerequisites Checklist
- [ ] All team members notified of upcoming changes
- [ ] No active development in progress
- [ ] Access to force push to protected branches (if any exist)

## 1. Backup Current State
- [ ] Create backup of current branch structure:
  ```bash
  git branch -a > branch_backup.txt
  git remote -v >> branch_backup.txt
  ```

## 2. Clean Outdated Branches
- [ ] Remove local feature branch:
  ```bash
  git branch -d feature/test-workflow
  ```
- [ ] Remove remote feature branch:
  ```bash
  git push origin --delete feature/test-workflow
  ```
- [ ] Remove outdated bug fix branch:
  ```bash
  git push origin --delete bugs/test-fix-001
  ```

## 3. Branch Restructuring
- [ ] Update main branch:
  ```bash
  git checkout main
  git pull origin main
  ```
- [ ] Reset test branch:
  ```bash
  git checkout test
  git reset --hard main
  git push origin test --force
  ```
- [ ] Reset dev branch:
  ```bash
  git checkout dev
  git reset --hard test
  git push origin dev --force
  ```

## 4. Verify New Structure
- [ ] Verify branches are properly aligned:
  ```bash
  git log --graph --oneline --all -n 20
  ```
- [ ] Confirm remote branches:
  ```bash
  git branch -avv
  ```

## Rollback Instructions
If issues occur during this phase:
1. Use branch backup:
   ```bash
   git checkout [branch]
   git reset --hard [previous-hash]
   git push --force origin [branch]
   ```
2. Restore deleted branches if needed:
   ```bash
   git checkout -b [branch-name] [last-known-commit]
   git push origin [branch-name]
   ```

## Success Criteria
- [x] Main, test, and dev branches exist and are properly aligned
- [x] Old feature and bugfix branches are removed
- [x] All branches can be pushed to without errors
- [x] Branch hierarchy is verified with git log

## Document Management
### Version Control
- This document should be maintained in the `docs` directory
- Changes to this document should follow the branch hierarchy:
  1. Make changes in `dev` branch
  2. Test in `test` branch
  3. Finally merge to `main`
- Include version history at bottom of document

### Branch Navigation
- When switching branches, this document should be treated as follows:
  - `main`: Contains the stable, approved version
  - `test`: Contains the version being validated
  - `dev`: Contains the latest updates and changes
- Document changes should be committed with message: "docs: update phase1_branch_cleanup.md"
- Always pull latest version before making changes:
  ```bash
  git checkout [branch]
  git pull origin [branch]
  ```

### Conflict Resolution
- If conflicts occur in this document:
  1. Always keep the most detailed version
  2. Merge changes from both versions if possible
  3. Consult team lead for resolution if needed
  4. Document significant conflict resolutions in version history

### Version History
| Version | Date | Branch | Changes | Author |
|---------|------|---------|----------|---------|
| 1.0.0   | [Current Date] | main | Initial document creation | [Your Name] |

## Next Steps
Once all success criteria are met, proceed to Phase 2: Workflow and Protection Setup
