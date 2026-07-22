# Commands

Run from the root.

## Library

- `yarn` — install (never use npm; Yarn workspaces).
- `yarn typecheck` — `tsc`.
- `yarn lint` / `yarn lint --fix` — ESLint (+ Prettier).
- `yarn test` — Jest. Single test: `yarn test path/to/file.test.tsx` or `yarn test -t "test name"`.
- `yarn prepare` — build the library with `react-native-builder-bob` (ESM module + TypeScript decls into `lib/`).
- `yarn release` — **user-only.** Publishes via release-it (conventional-changelog / angular preset), which commits, tags, and pushes. Agents must never run this; leave releases to the user.

## Example app

- `yarn example start` — Metro.
- `yarn example android` / `yarn example ios` / `yarn example web`.

JS changes reflect in the example without rebuild; **native changes require rebuilding the example app**.
