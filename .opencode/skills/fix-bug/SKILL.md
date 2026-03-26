---
name: fix-bug
description: Investigates and fixes bugs from the bug_reports table. Use this skill when you need to debug issues reported by users. The skill is interactive and collaborative - ask clarifying questions, explore creative options, and work together with the user to find the root cause.
allowed-tools: Bash, Glob, Grep, Read, Task, WebFetch, Question, Edit
---

# Bug Fixing Skill

## Overview

This skill helps investigate and fix bugs reported by users in the `bug_reports` table. It follows an interactive, collaborative approach - asking insightful questions, exploring potential root causes, and working with you to find the best fix.

## Workflow

### 1. Fetch Bug Report

Use the turso CLI to fetch bug reports from the database:

```bash
# List all open bug reports
turso db shell flex "SELECT id, user_id, description, severity, status, created_at FROM bug_reports WHERE status = 'open' ORDER BY created_at DESC LIMIT 5;"

# Get full details of a specific bug report
turso db shell flex "SELECT * FROM bug_reports WHERE id = '<bug-id>';"

# Check for recent bug reports
turso db shell flex "SELECT * FROM bug_reports ORDER BY created_at DESC LIMIT 10;"
```

The `bug_reports` table has these fields:
- `id`, `user_id`, `description`, `severity`
- `status` (open, in_progress, addressed, needs_manual_review)
- `created_at`, `updated_at`
- `resolved_at`, `resolved_by`, `resolution_note`
- `pr_url`, `opencode_session_id`, `error_message`

### 2. Understand the Issue

Once you have a bug report:
- Read the description carefully
- Identify what the user expected vs what happened
- Think about what part of the codebase could cause this
- Check if there are similar issues in recent patch notes (`src/patchNotes.ts`)

### 3. Investigate

Use code exploration tools to find the root cause:
- `Grep` to search for relevant patterns
- `Glob` to find related files
- `Read` to examine code
- `WebFetch` to look up documentation if needed

Ask clarifying questions when needed:
- "Does this happen on a specific page or everywhere?"
- "What browser/device were you using?"
- "Can you think of what you did right before this happened?"

### 4. Propose Fix

Once you've identified the issue:
1. Show your reasoning - what you found and why you think it's the root cause
2. Propose a fix approach
3. Ask for feedback before implementing
4. Make the fix

### 5. Verify

After fixing:
- Run lint: `npm run lint`
- Run tests: `npm run test:run` (or relevant test file)
- Verify the fix makes sense logically

### 6. Report Status

Summarize what you found and did:
- Root cause identified
- Fix applied
- Any follow-up needed

## Guidelines

- **Be interactive**: Ask questions, propose ideas, get input before making changes
- **Explore thoroughly**: Don't jump to conclusions; investigate multiple angles
- **Be creative**: There might be unexpected solutions
- **Know when to stop**: If the issue is unclear or would require too many changes, suggest escalating to manual review
- **Clean up**: Remove any debug code or temporary changes
- **Respect scope**: This skill focuses on fixing the bug only - don't handle commits, PRs, or deployment

## Example Session

```
> Use turso to check for any open bug reports
> Found: User can't click "Add Workout" button on dashboard

> "Can you tell me more about what happens when you try to click it? Does the page do anything, or does nothing happen at all?"

> "Okay, it sounds like it might be a UI issue where the button is disabled or covered. Let me look at the dashboard component to see what's happening."

> Searches for dashboard code, finds the button component
> "I see the button has a click handler. Let me check if there's a condition that might be preventing the click. Looks like it checks for `canAddWorkout` - let me trace where that's defined."

> Finds the issue - the condition is checking the wrong field
> "Found it! The code is checking `user.teamId` but it should check `user.team_id`. Want me to fix this?"
```

## Environment

- Project: Flex (Next.js micro-social media app)
- Stack: Next.js 16, React 19, TypeScript/JavaScript, Turso (libSQL), next-auth v5
- Node: >=18.15.0

## Common Commands

```bash
# Lint
npm run lint

# Run all tests
npm run test:run

# Run specific test file
npx vitest run tests/componentLogic.test.js

# Development server
npm run dev
```