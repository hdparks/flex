# AGENTS.md - Developer Guide for Flex

This document provides context for AI agents working on the Flex codebase.

## Project Overview

- **Project Name**: flex
- **Type**: Next.js micro-social media app for training
- **Stack**: Next.js 16, React 19, JavaScript/TypeScript, Turso (libSQL), next-auth v5
- **Node Version**: >=18.15.0
- **Test Framework**: Vitest with React Testing Library

## Commands

### Development
```bash
npm run dev      # Start dev server on port 4000
npm run build    # Production build
npm run start    # Start production server
```

### Linting
```bash
npm run lint    # Run ESLint with max-warnings 0
```

### Testing
```bash
npm test              # Run all tests in watch mode
npm run test:run      # Run all tests once (CI mode)
npx vitest run tests/componentLogic.test.js    # Run single test file
npx vitest run --grep "should"                 # Run tests matching pattern
```

## Code Style Guidelines

### File Organization
- Source code in `src/` directory
- App router pages in `src/app/` with route groups `(dashboard)` for authenticated routes
- API routes in `src/app/api/`
- Components in `src/components/`
- Library utilities in `src/lib/`

### Import Conventions
Use path alias `@/*` for files in `src/` (e.g., `@/lib/db`). Order: React imports → external libs → path alias → relative.

```typescript
// Good
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import db from '@/lib/db';
import MyComponent from './MyComponent';
```

### Naming Conventions
- **Files**: kebab-case for routes (e.g., `bug-reports`), kebab-case for utilities (e.g., `push.js`)
- **Components**: PascalCase (e.g., `ToastProvider.jsx`)
- **Functions/variables**: camelCase
- **Constants**: PascalCase for component constants, UPPER_SNAKE for config values
- **Route handlers**: GET, POST, PUT, DELETE as named exports

### TypeScript Adoption
**Priority: TypeScript-first**. All new files should be `.ts`/`.tsx`. Convert existing `.js`/`.jsx` files when working in them (Boy Scout rule).

Key points:
- TypeScript strict mode is disabled in tsconfig, but prefer explicit types over `any`
- Use `unknown` when the type is truly unknown; avoid implicit `any`
- Prefer interfaces for object shapes that may be extended
- Use type aliases for unions, intersections, and utility types

```typescript
// Good - explicit types
interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

// Avoid - implicit any
async function createWorkout(data: any): Promise<any> { ... }
```

### Recommended Types to Define
Create shared types in `src/lib/types.ts` for common data shapes:
- `User`, `SessionUser` (from auth)
- `Workout`, `CreateWorkoutInput`
- `Team`, `TeamMember`, `Cheer`
- API response types

### Component Patterns
- Client components must include `'use client'` directive
- Use named exports for page components
- Prefer functional components with hooks

### Popups & Dropdowns
Use **@floating-ui/react** for all popups, dropdowns, and floating UI elements. It handles edge detection, viewport overflow, and flipping automatically.

```typescript
import { useFloating, flip, shift } from '@floating-ui/react';

const { refs, floatingStyles } = useFloating({
  placement: 'top',
  middleware: [flip(), shift({ padding: 8 })],
});

return (
  <>
    <button ref={refs.setReference}>Trigger</button>
    <div ref={refs.setFloating} style={floatingStyles}>Content</div>
  </>
);
```

### API Routes
- Use NextResponse for responses
- Always handle auth with `auth()` from `@/lib/auth-config`
- Wrap in try/catch, log errors, return 500 on failure
- Validate request body before processing

```typescript
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await request.json();
    if (!data.type || !data.title) {
      return NextResponse.json({ error: 'Type and title required' }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Error Handling
- Use try/catch for async operations
- Log errors with `console.error(err)`
- Return appropriate HTTP status codes (400, 401, 403, 500)
- User-facing errors: use toast notifications via `useToast()` hook
- Never expose raw error messages to clients

### Styling
- Use CSS classes from `globals.css` (custom CSS variables, no Tailwind)
- Inline styles for dynamic values or one-off styles
- CSS variables defined in globals.css (e.g., `--primary`, `--surface`, `--border`)
- Utility classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.container`, `.avatar`, `.timestamp`, `.workout-type`

```typescript
<div className="card">...</div>
<div style={{ width: someVar }}>...</div>
style={{ color: 'var(--primary)' }}
```

### ESLint Rules
- Follows eslint-config-next core-web-vitals
- Max warnings: 0
- Use `// eslint-disable-next-line` sparingly for false positives

### Database
- Use `@libsql/client` with Turso
- Prepared statements for queries (no raw SQL interpolation)
- Always parameterize user input

```typescript
// Good
await db.prepare('SELECT * FROM users WHERE id = ?').get(id);

// Avoid - SQL injection risk
await db.prepare(`SELECT * FROM users WHERE id = '${id}'`);
```

### Auth
- Use next-auth v5 beta with `@/lib/auth-config`
- Session accessed via `useSession()` hook (client) or `auth()` (server)
- Protected routes check `session?.user`

### Push Notifications
- Use web-push for push notifications
- Use `@/lib/push.js` for notification helpers

### Service Worker (public/sw.js)
- Cache versioning is controlled by `CACHE_VERSION` at the top of the file
- **When to bump**: After any feature change that modifies static assets (icons, JS/CSS bundles, manifest) or when forcing users off stale cached data
- Increment `CACHE_VERSION` to trigger the `activate` event, which cleans up old caches and ensures users fetch fresh content
- Bumping the version will wipe the dynamic cache, so users may briefly lack cached API responses until caches rebuild

### File Extensions
- `.ts` - Type-safe utilities, lib files
- `.tsx` - React components with JSX (preferred)
- `.js` / `.jsx` - Only for simpler client-side utilities when strictly necessary

### Testing Patterns
Tests are in `tests/` directory using Vitest with React Testing Library.

```javascript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('Component logic', () => {
  it('should handle event correctly', () => {
    // test implementation
  });
});
```

### Patch Notes
After completing work, prompt the user to add an entry to `src/patchNotes.ts`:
```typescript
{ type: 'new' | 'fix' | 'update' | 'removal', text: 'description', credit?: 'user' }
```

## OpenCode-Assisted Bug Processing

### Using the Fix-Bug Skill

User can employ the `/fix-bug` skill to quickly investigate and fix bugs from the `bug_reports` table.

**Workflow:**
1. Run `turso db shell flex "SELECT * FROM bug_reports WHERE status = 'open';"` to fetch open bug reports
2. Use the `fix-bug` skill to investigate the issue
3. Apply the fix

**Bug Status Flow:**
- `open` → New bug reports waiting for processing
- `in_progress` → OpenCode is actively fixing the bug
- `addressed` → Bug has been fixed
