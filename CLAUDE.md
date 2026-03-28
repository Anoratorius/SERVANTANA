# Servantana

Marketplace for finding and booking professional services. Built with Next.js 16, React 19, TypeScript, Prisma ORM, Neon PostgreSQL.

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run db:migrate   # Prisma migrations
npm run db:push      # Push schema (no migration)
npm run db:seed      # Seed database
npm run db:studio    # Prisma Studio GUI
```

## Deployment

Auto-deploys via `git push` to main (Vercel).

```bash
git push                      # Auto-deploy
npx vercel --prod --force     # Manual (rare)
```

**URLs:** servantana.com | servantana-five.vercel.app

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** NextAuth.js v5 (JWT, credentials provider)
- **Database:** Prisma + Neon PostgreSQL
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **i18n:** next-intl v4 (en, de)

## Key Directories

```
src/app/[locale]/     # Pages with i18n routing
src/app/api/          # API routes
src/components/ui/    # shadcn/ui components
src/components/layout/# Header, Footer
src/lib/              # Auth, Prisma, utilities
src/locales/          # Translation JSONs
prisma/               # Schema, migrations, seed
middleware.ts         # Auth redirects, i18n, IP restriction
```

## Architecture

### Auth Flow (src/lib/auth.ts)
- JWT strategy with credentials provider
- Roles: CUSTOMER, CLEANER, ADMIN
- Session includes: id, role, firstName, lastName, isEmailVerified
- JWT includes: role, onboardingComplete (for workers)

### Auth Redirects (middleware.ts)
All auth-based redirects happen in middleware:
- Email not verified → /email-verification-required
- Worker onboarding incomplete → /worker/onboarding

### Database Models
User, CleanerProfile, Service, Booking, Review, Message, Favorite, Availability

### i18n
- Middleware handles locale detection
- `useTranslations()` hook in components
- Translations in `src/locales/{en,de}.json`
- Default: English, prefix: as-needed

## Code Conventions

- Path alias: `@/*` → `src/*`
- Client components: `"use client"` directive
- UI: shadcn/ui from `src/components/ui/`
- Forms: react-hook-form + zod
- Toasts: Sonner
- Database: Prisma singleton `src/lib/prisma.ts`

## Design Standards

### Mobile-First
Most users are on mobile. Design for 375px first.

- All content centered and symmetrical
- Buttons fully visible, never cut off
- Touch targets minimum 44px
- No horizontal scrolling
- Badges/tags: `flex-wrap justify-center`

### Page Structure
```tsx
<main className="flex-1 bg-...">
  <div className="container mx-auto px-4 max-w-5xl">
    {/* Centered content */}
  </div>
</main>
```

### Responsive Classes
- Mobile only: `md:hidden`
- Desktop only: `hidden md:block`
- Different sizes: `text-sm md:text-lg`

## Environment Variables

```
POSTGRES_PRISMA_URL      # Pooled connection
POSTGRES_URL_NON_POOLING # Direct connection
NEXTAUTH_URL             # Auth callback URL
NEXTAUTH_SECRET          # JWT secret
```
