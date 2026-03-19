# AGENTS.md - Developer Guide for Flex

This document provides context for AI agents working on the Flex codebase.

## Project Overview

- **Project Name**: flex
- **Type**: Next.js micro-social media app for training
- **Stack**: Next.js 16, React 19, JavaScript/TypeScript, Turso (libSQL), next-auth
- **Node Version**: >=18.15.0

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
- **No tests currently configured** - Consider adding Vitest/Jest for unit tests and Playwright for E2E tests

## Code Style Guidelines

### File Organization
- Source code in `src/` directory
- App router pages in `src/app/` with route groups `(dashboard)` for authenticated routes
- API routes in `src/app/api/`
- Components in `src/components/`
- Library utilities in `src/lib/`

### Import Conventions
- Use path alias `@/*` for files in `src/` (e.g., `@/lib/db`)
- Use relative imports for same-directory components
- Order: React imports → external libs → path alias → relative

```typescript
// Good
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import db from '@/lib/db';
import MyComponent from './MyComponent';

// Avoid
import MyComponent from '../components/MyComponent';  // relative to lib
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

// Good - explicit function params
async function createWorkout(data: { type: string; title: string }): Promise<Workout> { ... }

// Avoid
async function createWorkout(data: any): Promise<any> { ... }
```

### Recommended Types to Define
Create shared types in `src/lib/types.ts` for common data shapes:
- `User`, `SessionUser` (from auth)
- `Workout`, `CreateWorkoutInput`
- `Team`, `TeamMember`
- `Cheer`
- API response types

### Component Patterns
- Client components must include `'use client'` directive
- Use named exports for page components
- Prefer functional components with hooks

```typescript
// Page component (named export)
export default function Dashboard() { ... }

// Helper component (can be in same file)
function WorkoutCard({ workout }: { workout: Workout }) { ... }
```

### API Routes
- Use NextResponse for responses
- Always handle auth with `auth()` from `@/lib/auth-config`
- Wrap in try/catch, log errors, return 500 on failure
- Validate request body before processing
- Prefer TypeScript for type-safe request/response handling

```typescript
interface CreateWorkoutRequest {
  type: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  completed_at?: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data: CreateWorkoutRequest = await request.json();
    if (!data.type || !data.title) {
      return NextResponse.json({ error: 'Type and title required' }, { status: 400 });
    }
    // ... create workout
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
// CSS class
<div className="card">...</div>

// Inline for dynamic values
<div style={{ width: someVar }}>...</div>

// CSS variable
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

### File Extensions
- `.ts` - Type-safe utilities, lib files
- `.tsx` - React components with JSX (preferred)
- `.js` - Only for simpler client-side utilities or when strictly necessary
- `.jsx` - Only for simpler React components when strictly necessary