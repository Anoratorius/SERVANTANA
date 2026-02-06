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
