# Conventions

## Git

- **Agents must never perform mutating git operations** — no `commit`, `add`/staging, `push`, `merge`, `rebase`, `reset`, branch/tag creation or deletion, etc. Only read-only git usage (`status`, `diff`, `log`, `show`, `blame`, …) is allowed. Leave all commits and staging to the user.

## Releases & CI

- Commits follow Conventional Commits (angular preset) — release notes and version bumps are derived from them. (Agents don't commit; this governs the user's commits and the release flow.)
- Releasing (`yarn release`) is a **user-only** action — see [commands.md](commands.md).
- Node version is pinned in `.nvmrc`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, library build, and Android/iOS/web example builds. Agents should run lint, typecheck, and tests locally before handing changes back to the user.
