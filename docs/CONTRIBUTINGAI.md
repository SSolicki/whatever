Guide for Iterative Code Analysis and Task Delegation Based on User Requests
This guide ensures a systematic approach to processing user requests by completing a high-level analysis in a dedicated analysis branch. It documents the master plan before delegating tasks to domain-specific branches. Each branch will perform its own iterative analysis for detailed implementation.

Domain Experts and Branches
Front-end: Handles user-facing UI changes and interactions.
Back-end: Manages APIs, database integration, and server-side logic.
Feature: Implements new functionality or enhances existing features.
Refactor: Focuses on codebase cleanup, optimization, and architectural improvements.
Process Overview
Create a Dedicated Analysis Branch

Set up a branch (e.g., analysis/request-[brief-description]) to document findings in currentwork.md.
Conduct a comprehensive high-level analysis of the request.
Iterative Codebase Analysis

Analyze the request against the codebase in iterations.
Identify all high-level steps required to address the request.
Ensure no major components or dependencies are overlooked.
Delegate to Domain Experts

Stop analysis when the high-level tasks are fully understood.
Create branch-specific currentwork.md files in the relevant domain expert branches.
Each branch gets only the high-level task description.
Domain-Specific Iterative Analysis

Domain experts (via their branches) perform their own detailed analysis and task delegation.
Completion Check

Use the master currentwork.md in the analysis branch as the source of truth to track progress.
Step-by-Step Workflow
1. Create an Analysis Branch
Objective: Prepare a dedicated space for high-level analysis.
Action:
Create a branch: analysis/request-[brief-description].
Start currentwork.md to document request objectives and initial findings.
2. Iterative Codebase Analysis
For each iteration:

Review the Codebase

Locate impacted files, components, or modules based on the request.
Analyze dependencies and potential cross-domain impacts.
Document Findings

Update currentwork.md with new insights from each iteration.
Break down the request into high-level tasks.
Refine High-Level Steps

Repeat analysis until all major steps are identified and tasks are categorized.
Stop analysis when:

All high-level tasks and affected areas are fully documented.
There is enough clarity to delegate tasks to the domain-specific branches.
3. Delegate to Domain Experts
Create Branch-Specific Files

Navigate to each domain expert's branch (e.g., front-end/[feature-name], back-end/[feature-name]).
Create or update currentwork.md with the high-level description of tasks for that domain.
High-Level Task Descriptions

These files provide domain experts with:
A clear task description.
Expected outcomes.
No iterative analysis or breakdown; experts handle this in their branches.
4. Domain-Specific Iterative Analysis
Each domain expert independently:
Analyzes their assigned tasks in detail.
Breaks them down into smaller steps.
Delegates to functional experts if necessary.
Updates their branch-specific currentwork.md.
5. Completion Check
Use the master currentwork.md in the analysis branch as the authoritative checklist.
Ensure all tasks from the analysis are completed and aligned with the user request.
Templates
Master currentwork.md (Analysis Branch)
This file serves as the master checklist for all high-level tasks.

# Current Work Document (Master Checklist)

## Request Overview
- **User Request**: [Summarize the request here]

## High-Level Objectives
1. [High-level objective]
2. [High-level objective]
3. [High-level objective]

## Iteration Findings
### Iteration [N]
- **Impacted Components**: [List here]
- **Dependencies**: [List here]
- **Tasks Identified**: [Detailed tasks]

## Task Delegation
### Front-end
- [High-level task description for Front-end]

### Back-end
- [High-level task description for Back-end]

### Feature
- [High-level task description for Feature]

### Refactor
- [High-level task description for Refactor]

## Checklist
- [ ] High-level objectives finalized
- [ ] Tasks categorized by domain
- [ ] Master `currentwork.md` finalized
- [ ] Branch-specific `currentwork.md` created
Branch-Specific currentwork.md (Domain-Specific Branches)
This file contains only the high-level task description, leaving detailed analysis to the domain expert.

# Current Work Document (Branch-Specific)

## Request Overview
- **User Request**: [Summarize the request here]

## High-Level Task Description
- **Task**: [Summarize the high-level task for this domain]
- **Expected Outcome**: [What the task should achieve]

## Checklist
- [ ] Task completed
- [ ] Progress updated to master checklist
Common Pitfalls to Avoid
Incomplete High-Level Analysis

Failing to identify all major components or dependencies.
Stopping analysis prematurely without sufficient clarity.
Overloading Domain Experts

Assigning detailed analysis in addition to implementation.
Providing vague or incomplete task descriptions.
Checklist Misalignment

Discrepancies between the master checklist and branch-specific tasks.
Inconsistent updates across branches.
