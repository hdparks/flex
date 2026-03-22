---
name: bug-tracker
description: Manage and address bug reports from the database. Use when user asks to work on bugs, fix issues, check unaddressed reports, or address bugs/features. Fetches open bug reports, helps plan fixes, creates branches, notifies admins, and marks items as addressed.
---

# Bug Tracker Skill

This skill helps manage the bug_reports table in the Turso database. Use it to find, address, and close bug reports and feature requests.

## Database Schema

The `bug_reports` table has these columns:
- `id` (TEXT, PRIMARY KEY)
- `user_id` (TEXT, NOT NULL) - reporter's user ID
- `description` (TEXT, NOT NULL) - the bug or feature request
- `severity` (TEXT) - 'low', 'medium', 'high', 'critical', or 'feature-request'
- `created_at` (DATETIME)
- `status` (TEXT) - 'open' or 'addressed'
- `resolved_at` (DATETIME) - when marked addressed
- `resolved_by` (TEXT) - who resolved it (typically 'agent')
- `resolution_note` (TEXT) - description of what was done
- `pr_url` (TEXT) - link to the pull request

## API Endpoints

### GET /api/bug-reports?status=open
Fetch bug reports. Optional `status` param filters by 'open' or 'addressed'.

**Example:**
```javascript
// Fetch all open bugs
await fetch('/api/bug-reports?status=open')
// Returns array of bug reports with reporter info (username, avatar)
```

### PUT /api/bug-reports/[id]
Update a bug report. No authentication required.

**Body:**
```javascript
{
  status: 'addressed',           // required when marking resolved
  resolution_note: 'Fixed by...', // description of the fix
  pr_url: 'https://github.com/...' // link to PR
}
```

### POST /api/admin/notify
Send push notification to all admins.

**Body:**
```javascript
{
  title: 'Bug Fix Ready',         // notification title
  body: 'PR #123 is ready',        // notification body
  url: '/dashboard'               // optional - where to go when clicked
}
```

## Workflow

### 1. Find Unaddressed Reports
When asked to work on bugs, first fetch open reports:
```
GET /api/bug-reports?status=open
```

### 2. Present Prioritized List
Display bugs in priority order (critical → high → medium → low → feature-request):
```
=== Open Bug Reports (4) ===

1. [critical] Comment button doesn't do anything
   Reported: 2026-03-21 by hparkinson

2. [feature-request] Filter feed by date range
   Reported: 2026-03-19 by bria

...
```

### 3. Select Which to Address
Ask user which bug(s) to address, or handle one at a time.

### 4. Investigate & Plan
For each selected bug:
- Read the relevant code to understand the issue
- Trace through the application logic
- Form a clear understanding of what needs to change

### 5. Create Branch & Implement
```bash
git checkout -b fix/[brief-description]
```
Implement the fix following project conventions.

### 6. Commit & Push
```bash
git add .
git commit -m "Fix: [brief description of the fix]"
git push -u origin HEAD
```

### 7. Notify Admin for Confirmation
Call the notify endpoint with the PR link:
```
POST /api/admin/notify
{
  "title": "Bug Fix Ready for Review",
  "body": "Fixed: [bug description]. PR: [link]",
  "url": "[PR URL]"
}
```

### 8. Wait for Confirmation
**IMPORTANT**: Do NOT mark the bug as addressed until the user confirms. The user must explicitly say "yes, go ahead" or similar approval.

### 9. Mark as Addressed
After user confirmation:
```
PUT /api/bug-reports/[id]
{
  "status": "addressed",
  "resolution_note": "Fixed by [describing what was changed]",
  "pr_url": "[PR URL]"
}
```

### 10. Repeat
Continue with next bug if applicable.

## Example Conversation

```
User: work on the open bugs

You: Let me fetch the open bug reports...
→ GET /api/bug-reports?status=open

Found 3 open reports:

1. [critical] Comment button doesn't do anything
   Reported: 2026-03-21 by hparkinson

2. [feature-request] Filter feed by date range  
   Reported: 2026-03-19 by bria

3. [low] Profile icon doesn't load on team page
   Reported: 2026-03-19 by hparkinson

Which would you like me to address? (1, 2, 3, or 'all')

User: let's start with 1

You: Let me investigate the comment button issue...

[Investigation complete]

I've identified the issue: the comment handler isn't wired up in the component.

Would you like me to create a fix?

User: yes

You: Creating branch and implementing fix...

[Implementation complete]

Branch created: fix/comment-button
PR: https://github.com/.../pull/123

I'll notify the admin for approval.

→ POST /api/admin/notify { title, body, url: PR link }

Waiting for confirmation...

User: looks good, go ahead

You: Marking bug as addressed...

→ PUT /api/bug-reports/[id] { status: 'addressed', ... }

Done! Bug #1 marked as addressed. Would you like to continue with the next bug?
```

## Notes

- Always present a clear, prioritized list before taking action
- Use severity for ordering: critical > high > medium > low > feature-request
- Always wait for explicit confirmation before marking bugs addressed
- Include PR link in both notification AND resolution_note
- If a fix is complex, break it into smaller steps
- Run lint and tests before committing
