# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

**react-native-memory-footprint** is a tiny React Native TurboModule (new architecture only) exposing one function, `getMemoryFootprint(): number`, returning the app process's memory footprint in bytes.

## Essentials

- **Package manager: Yarn** (Yarn workspaces monorepo). Never use npm.
- `yarn typecheck` — type-check with `tsc`.
- `yarn lint` / `yarn lint --fix` — ESLint + Prettier.
- `yarn test` — Jest.
- **Never run mutating git operations** (commit, add/stage, push, merge, rebase, reset, etc.). Only read-only git usage (`status`, `diff`, `log`, `show`, …) is allowed. Leave all commits and staging to the user.
- **The JS spec, iOS, and Android implementations must stay in sync.** Changing the signature in `src/NativeMemoryFootprint.ts` requires matching changes in both native files and a rebuild of the example app. See [docs/architecture.md](docs/architecture.md).

## More detail

- [docs/architecture.md](docs/architecture.md) — what the module measures, repo layout, and the three-layer sync rule.
- [docs/commands.md](docs/commands.md) — full command list, example app, and build/release.
- [docs/conventions.md](docs/conventions.md) — commits, Node version, and CI.
