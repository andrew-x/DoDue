# Developer Docs

Last checked: 2026-05-07

Use these links as the required first external references before making decisions about the corresponding tools. Prefer the `llms.txt` indexes when available because they are optimized for agent ingestion.

Agents should use broad web search only after the relevant entry here and official docs are insufficient, stale, unavailable, or the user explicitly asks for web search. If a recurring external reference is missing, add its canonical docs link here instead of relying on ad hoc search in future tasks.

## Agent Runtimes

- [OpenAI Codex docs LLM index](https://developers.openai.com/codex/llms.txt) - Use for Codex CLI, app, cloud, AGENTS.md, hooks, skills, subagents, config, sandboxing, approvals, and runtime customization.
- [Claude Code docs LLM index](https://code.claude.com/llms.txt) - Use for Claude Code settings, CLAUDE.md memory, hooks, skills, subagents, MCP, permissions, and CLI behavior.

## Runtime, Build, And Language

- [Bun documentation](https://bun.sh/docs) - Use for package running, script execution, lockfile behavior, and Bun-specific tooling.
- [Vite guide](https://vite.dev/guide/) - Use for Vite app structure, dev server behavior, production builds, plugins, aliases, and environment variables.
- [React documentation](https://react.dev/reference/react) - Use for React 19 component APIs, hooks, rendering behavior, and JSX runtime expectations.
- [React Compiler documentation](https://react.dev/learn/react-compiler) - Use for compiler behavior, directives, lint expectations, and Babel/plugin setup.
- [TypeScript TSConfig reference](https://www.typescriptlang.org/tsconfig/) - Use for compiler options, project references, JSX settings, module resolution, and strictness behavior.

## Code Quality

- [Biome configuration reference](https://biomejs.dev/reference/configuration/) - Use for lint, format, organize imports, VCS ignore behavior, and config-file options.

## UI, Icons, And Styling

- [shadcn/ui docs LLM index](https://ui.shadcn.com/llms.txt) - Use for accessible component patterns, Vite installation, theming, registry workflows, and Tailwind/Radix-based UI conventions.
- [Lucide docs LLM index](https://lucide.dev/llms.txt) - Use for icon selection, React icon usage, sizing, stroke width, accessibility, and global icon styling.
- [Tailwind CSS utility styling](https://tailwindcss.com/docs/styling-with-utility-classes) - Use for utility-class composition, responsive styling, variants, spacing, color, and state-based styling.
- [Tailwind CSS Vite installation](https://tailwindcss.com/docs/installation/using-vite) - Use for the `@tailwindcss/vite` plugin, stylesheet import, and Vite integration.
- [Sass documentation](https://sass-lang.com/documentation/) - Use for custom Sass syntax, nesting, modules, built-ins, and CSS interoperability.
- [Lexical docs](https://facebook-lexical.mintlify.app/) - Use for rich text editor setup, React plugins, custom nodes, and text entity transforms.
- [dnd-kit React quickstart](https://dndkit.com/react/quickstart/) - Use for React drag-and-drop providers, draggable hooks, and droppable targets.
- [dnd-kit sortable state management](https://dndkit.com/react/guides/sortable-state-management/) - Use for sortable hooks, reorder helpers, grouped sortable lists, and persisted sortable state.

## Routing And Data

- [TanStack Router latest docs](https://tanstack.com/router/latest) - Use for route trees, file-based routing, navigation, params, search params, loaders, and route-level type safety.
- [TanStack Router authenticated routes](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) - Use for route guards, `beforeLoad`, and redirects from protected pages.
- [TanStack Query latest docs](https://tanstack.com/query/latest) - Use for server-state fetching, caching, invalidation, mutations, optimistic updates, and async state management.
- [Zod documentation](https://zod.dev/) - Use for runtime schema validation, parsing, transforms, and TypeScript inference.
- [Firebase web setup](https://firebase.google.com/docs/web/setup) - Use for Firebase JS SDK installation, web app configuration, and service initialization.
- [Firebase Auth web start](https://firebase.google.com/docs/auth/web/start) - Use for Firebase Auth initialization and web authentication flows.
- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) - Use for Google provider setup, popup/redirect login, and sign-out details.
- [Cloud Firestore get data](https://firebase.google.com/docs/firestore/query-data/get-data) - Use for Firestore initialization, document reads, collection reads, and query snapshots.
- [Cloud Firestore Security Rules field validation](https://firebase.google.com/docs/firestore/security/rules-fields) - Use for allowed-field checks, immutable fields, and schema-like type validation in security rules.

## Maintenance Notes

- When a dependency is added to the project, add its canonical docs here if future agents will need them.
- When using one of these sources for a durable decision, cite the specific focused page in the relevant project doc instead of only citing this index.
- Keep this file to pointers and usage guidance. Put project-specific conventions in focused docs or `AGENTS.md`.
