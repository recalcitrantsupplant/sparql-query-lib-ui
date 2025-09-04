# Repository Guidelines

## Project Structure & Module Organization
- `pages/`: Nuxt routes (e.g., `pages/queries.vue`, `pages/admin.vue`).
- `components/`: Vue components (PascalCase, e.g., `QueryEditorView.vue`).
- `composables/`: Reusable logic (camelCase prefixed with `use`, e.g., `useQueryExecution.ts`).
- `layouts/`: App layout shells (`default.vue`).
- `assets/` and `public/`: Styles, static assets (Tailwind at `assets/css/tailwind.css`).
- `lib/` and `types/`: Helpers and TypeScript types.
- `docs/`: Design notes and OpenAPI schema.
- `nuxt.config.ts`: Runtime config (`NUXT_PUBLIC_API_URL`), dev port `3001`.

## Build, Test, and Development Commands
- `pnpm dev`: Start Nuxt dev server at `http://localhost:3001`.
- `pnpm build`: Production build.
- `pnpm preview`: Preview the production build locally.
- `pnpm generate`: Static-site generation (used by CI for Azure SWA).
- `pnpm postinstall` (auto): `nuxt prepare` to generate types.

## Coding Style & Naming Conventions
- Language: Vue 3 + Nuxt 3, TypeScript, Vite. Indentation: 2 spaces.
- Components: PascalCase filenames; `<script setup lang="ts">` preferred.
- Composables: `useX.ts` (camelCase) in `composables/`.
- Paths: Use `@/` aliases (see `tsconfig.json`).
- Styling: Tailwind CSS; keep class lists readable and co-locate component styles.
- UI: shadcn-nuxt components live under `components/ui/` (do not rename generated files).

## Testing Guidelines
- No automated tests are configured yet. If adding tests, prefer Vitest + Nuxt Test Utils.
- Place unit tests alongside sources or under `tests/` with `*.spec.ts` naming.
- For UI changes, include manual QA steps and screenshots/GIFs in PRs.

## Commit & Pull Request Guidelines
- Commits: Present tense, concise scope (e.g., `fix: args display`, `ci: update SWA workflow`).
- Prefer Conventional Commits prefixes (`feat|fix|chore|ci|docs|refactor`) when practical.
- PRs: Include description, linked issues, screenshots for UI, and test/QA steps.
- Keep diffs focused; note any config changes (e.g., `NUXT_PUBLIC_API_URL`).

## Security & Configuration Tips
- Backend URL: set `NUXT_PUBLIC_API_URL` (defaults to `http://localhost:3050`).
- SSR is disabled (`ssr: false`); prefer `pnpm generate` for static deploys.
- Do not commit secrets; environment is read via Nuxt runtime config.
