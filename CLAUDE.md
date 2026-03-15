# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Servantana is a marketplace application for finding and booking professional cleaning services. Built with Next.js 16 (App Router), React 19, TypeScript, and Prisma ORM with SQLite.

## Common Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # ESLint validation
npm run db:migrate       # Create and apply Prisma migrations
npm run db:push          # Push schema changes without migration
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio GUI
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 with App Router
- **Auth:** NextAuth.js v5 (JWT strategy, OAuth + credentials providers)
- **Database:** Prisma ORM with SQLite (dev.db)
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **i18n:** next-intl v4 (8 languages: en, de, es, fr, ru, zh, ja, ka)

### Key Directories
- `src/app/[locale]/` - Pages with i18n dynamic routing
- `src/app/api/` - API route handlers
- `src/components/ui/` - shadcn/ui components
- `src/components/layout/` - Header, Footer, LanguageSwitcher
- `src/i18n/` - Internationalization config and routing
- `src/locales/` - Translation JSON files per language
- `src/lib/` - Auth config, Prisma client, utilities
- `prisma/` - Schema, migrations, seed script

### Route Groups
- `(auth)/` - Login and signup pages
- `(public)/` - Public pages like search

### Authentication Flow
NextAuth.js configured in `src/lib/auth.ts`:
- OAuth providers: Google, Facebook, Apple
- Credentials provider with bcrypt password validation
- User roles: CUSTOMER, CLEANER, ADMIN
- Session extended with role, firstName, lastName

### Database Models (prisma/schema.prisma)
Core entities: User, CleanerProfile, Service, CleanerService, Booking, Review, Message, Favorite, Availability

### Internationalization Pattern
- Middleware handles locale detection (`middleware.ts`)
- Use `useTranslations()` hook in components
- Translations in `src/locales/{locale}.json`
- Default locale is English with "as-needed" prefix strategy

## Critical Rules

### ⛔ ABSOLUTE RULE: ASK PERMISSION BEFORE ANY CHANGE ⛔

**THIS IS THE MOST IMPORTANT RULE. VIOLATION IS UNACCEPTABLE.**

Before modifying ANY file, you MUST:
1. **STOP** - Do not write, edit, or change anything yet
2. **ASK** - Tell the user exactly what you plan to change and why
3. **WAIT** - Get explicit permission ("yes", "ok", "do it", etc.)
4. **ONLY THEN** - Make the change

**NO EXCEPTIONS. EVER.**

This applies to:
- Adding new code
- Modifying existing code
- Deleting code
- Changing configurations
- Updating dependencies
- ANY file modification whatsoever

**What "asking permission" looks like:**
- ✅ "I need to modify `src/components/Header.tsx` to add the logo. Should I proceed?"
- ✅ "This requires changes to 3 files: X, Y, Z. Can I make these changes?"
- ❌ Just making changes and telling the user after
- ❌ Assuming permission because it seems related to the task

**If the user gives a broad task like "implement feature X":**
1. First explain what files need to be created/modified
2. List all changes you plan to make
3. Wait for approval
4. Only then implement

**Consequences of violating this rule:**
- User's existing work gets broken
- User has to redo things multiple times
- User loses trust
- User's time is wasted

**When in doubt: ASK. Always ASK.**

---

### Do NOT Change Unrelated Code
When asked to make a specific change, change ONLY what was requested. Do NOT:
- "Fix" or "improve" nearby code
- Update related strings or values that weren't mentioned
- Refactor or clean up code you happen to see
- Add translations for things that weren't asked
- Change formatting, naming, or structure of untouched code

If the user asks to "add German translations for categories", add ONLY the category translations. Do not touch titles, subtitles, or anything else. One task = one change. Stay in your lane.

### Follow Instructions Exactly
Do EXACTLY what the user asks. Do NOT interpret, assume, or expand on requests.

- If the user provides text to replace, replace it with EXACTLY that text
- If the user asks for your opinion, give it and WAIT for confirmation before implementing
- If the user says "ok" or confirms, THEN implement
- Do NOT add, remove, or modify anything beyond what was explicitly requested
- One small change means ONE small change - not multiple "improvements"

Example:
- User: "Change X to Y" → Change X to Y. Nothing else.
- User: "What do you think about X?" → Give opinion, wait for response
- User: "Ok do it" → Now implement

### One Change Does NOT Require Another
Making one change does NOT justify or require making other changes unless ABSOLUTELY necessary for the first change to work. Examples:
- Adding a new page does NOT require changing existing page layouts
- Fixing a bug does NOT require refactoring surrounding code
- Adding translations does NOT require changing component structure
- Creating new files does NOT require modifying unrelated existing files

If a change CAN work without touching other files, then DO NOT touch other files. Period.

### Never Revert User Changes
If the user has modified code (either manually or by asking you to change it):
- Do NOT change it back unless explicitly asked
- Do NOT "fix" or "improve" their modifications
- Do NOT undo their decisions
- Their code is THEIR code - hands off

Before editing ANY file, ask yourself: "Did the user recently modify this?" If yes, do NOT touch it unless they specifically ask you to.

### Pre-Edit Checklist
Before EVERY code change, verify:
1. Was I explicitly asked to make this change? If no → STOP
2. Did the user modify this code recently? If yes → STOP (unless they asked)
3. Is this the minimum change needed? If no → reduce scope
4. Am I adding anything not requested? If yes → remove it

If any check fails, do NOT proceed.

## Layout Standards

### Centering and Symmetry
ALL pages must be centered and symmetrical by default, both on mobile and web. This is a fundamental requirement - do NOT create pages without proper centering.

**Required patterns:**
- Use `container mx-auto px-4` on all main content wrappers
- Add `max-w-*` constraint (typically `max-w-3xl`, `max-w-4xl`, or `max-w-5xl`) to prevent content from stretching full width
- Use `text-center` for headings and hero sections
- Use `mx-auto` on grid/flex containers when centering is needed

**Page structure template:**
```tsx
<main className="flex-1 bg-...">
  <div className="container mx-auto px-4 max-w-5xl">
    {/* Centered content */}
  </div>
</main>
```

This applies to ALL pages - never create a page without these centering classes.

## Code Conventions

- Path alias: `@/*` maps to `src/*`
- Mark client components with `"use client"` directive
- Use shadcn/ui components from `src/components/ui/`
- Access translations via `useTranslations()` from next-intl
- Database access through Prisma singleton in `src/lib/prisma.ts`
- Form validation with react-hook-form + zod
- Toast notifications via Sonner

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_URL` - Auth callback URL
- `NEXTAUTH_SECRET` - JWT secret
- OAuth credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.
