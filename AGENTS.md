# Repository Guidelines

## Project Structure & Module Organization
- Next.js 16 App Router; entry layout in `app/layout.tsx`, shared styles in `app/globals.css`.
- Feature routes live under `app/` (`login`, `signup`, `posts`, `profile`, `search`, `write-post`). Home reuses `app/posts/page.tsx`.
- Reusable UI and feature widgets sit in `components/` (e.g., `components/ui/*` for primitives, `components/posts` for views).
- Domain logic in `lib/` (`auth` for NextAuth config, `db`/`mongodb.ts` for connections, `validation` utilities).
- Mongoose schemas in `schema/`, shared typings in `types/`, public assets in `public/`, and seed script in `scripts/seed.ts`.

## Build, Test, and Development Commands
- `bun dev` — start the local Next.js dev server.
- `bun run build` — production build; fails on type errors.
- `bun start` — run the built app.
- `bun run lint` — ESLint across the project.
- `bun run seed` — seed MongoDB with sample data.

## Coding Style & Naming Conventions
- TypeScript throughout; favor functional React components and hooks; keep server actions in `app/actions`.
- Use `Result<T, E>` pattern for server action returns (see `types/common/result.ts`).
- Two-space indentation, trailing commas, and named exports where practical; keep filenames kebab-case (`write-post`, `login-form.tsx`).
- Tailwind CSS 4 for styling; prefer existing utility patterns and `tailwind-merge` to avoid class clashes.
- Use shadcn/ui (Radix UI) + `sonner` for notifications in `components/ui`.

## Testing Guidelines
- No formal test suite yet; add unit tests alongside code under `__tests__` or co-locate as `*.test.ts(x)` when introducing new logic.
- Focus on pure utilities in `lib/` first; for React pieces, prefer lightweight render tests.
- Run `bun run lint` before submitting; treat lint-clean output as a minimum bar.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative commit style (`Add screenshot of post detail`, `Setup environment`); scope commits narrowly.
- Branches should describe the work (`feature/search-pagination`, `fix/profile-avatar`).
- Pull requests: include a clear summary, linked issues, screenshots for UI changes, and notes on database impacts.

## Environment & Security Notes
- Configuration is managed via `config.json`.
- DO NOT commit `config.json` containing real secrets. Use `config.example.json` as a template.
- Avoid environment variable fallbacks in code; strictly use `lib/config.ts`.
