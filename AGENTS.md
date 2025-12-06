# Repository Guidelines

## Project Structure & Module Organization
- Next.js 16 App Router; entry layout in `app/layout.tsx`, shared styles in `app/globals.css`.
- Feature routes live under `app/` (`login`, `signup`, `posts`, `profile`, `search`, `write-post`). Home reuses `app/posts/page.tsx`.
- Reusable UI and feature widgets sit in `components/` (e.g., `components/ui/*` for primitives, `components/posts` for views).
- Domain logic in `lib/` (`auth` for NextAuth config, `db`/`mongodb.ts` for connections, `validation` utilities).
- Mongoose schemas in `schema/`, shared typings in `types/`, public assets in `public/`, and seed script in `scripts/seed.ts`.

## Build, Test, and Development Commands
- `npm run dev` — start the local Next.js dev server.
- `npm run build` — production build; fails on type errors.
- `npm start` — run the built app.
- `npm run lint` — ESLint across the project.
- `npm run seed` — seed MongoDB with sample data (`bun` required).

## Coding Style & Naming Conventions
- TypeScript throughout; favor functional React components and hooks; keep server actions in `app/*/actions`.
- Two-space indentation, trailing commas, and named exports where practical; keep filenames kebab-case (`write-post`, `login-form.tsx`).
- Tailwind CSS 4 for styling; prefer existing utility patterns and `tailwind-merge` to avoid class clashes.
- Use Radix UI + custom primitives in `components/ui` before adding new dependencies.

## Testing Guidelines
- No formal test suite yet; add unit tests alongside code under `__tests__` or co-locate as `*.test.ts(x)` when introducing new logic.
- Focus on pure utilities in `lib/` first; for React pieces, prefer lightweight render tests.
- Run `npm run lint` before submitting; treat lint-clean output as a minimum bar.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative commit style (`Add screenshot of post detail`, `Setup environment`); scope commits narrowly.
- Branches should describe the work (`feature/search-pagination`, `fix/profile-avatar`).
- Pull requests: include a clear summary, linked issues, screenshots for UI changes, and notes on database impacts (e.g., new fields in `schema/post.ts` or migration/seed changes).

## Environment & Security Notes
- Required env vars: `MONGODB_URI` for database access and `NEXTAUTH_SECRET` for NextAuth; set them in `.env.local`.
- Avoid committing secrets; prefer placeholders in examples. If touching auth/db code, verify credentials are read only from env and handled server-side.
