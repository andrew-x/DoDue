# DoDue

React 19, TypeScript, and Vite application using Bun.

## Commands

- `bun run dev` starts the Vite dev server on port `3000`.
- `bun run lint` runs Biome checks for linting, formatting, and import organization.
- `bun run format` applies Biome formatting, safe fixes, and import organization.
- `bun run build` runs TypeScript and the Vite production build.

## Stack

- Tailwind CSS for utility-first styling.
- shadcn/ui conventions for components.
- Lucide React for icons.
- Sass for custom CSS outside utility-class composition.
- Biome for code quality instead of separate lint and format tools.
- Firebase Auth and Firestore for backend services.
- TanStack Query wraps normal Firestore SDK reads and mutations for caching and invalidation.
- TanStack Router for page routing and protected routes.

## Routes

- `/` is the public landing page with Google login.
- `/home` is the protected task workspace.
- Unknown routes render the public 404 page.

## Firebase

Copy `.env.example` to `.env.local` and fill in the Vite Firebase values from
your Firebase web app configuration. Enable Google as a Firebase Auth sign-in
method before using the login button.
