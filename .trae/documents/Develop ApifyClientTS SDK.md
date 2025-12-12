I have updated the plan to ensure `ApifyClientTS` is a **fully independent, standalone package** within the directory. It will not rely on the root project's configuration or dependencies.

## 1. Independent Project Setup

* **Directory:** `packages/apify_ts/`
* **Independence:**
  * The package will have its own `package.json` with **all** necessary `dependencies` and `devDependencies` explicitly listed.
  * It will have its own `tsconfig.json`, `jest.config.js`, and build scripts, ensuring it can be moved or published without the parent monorepo.
* **Dependencies (Self-Contained):**
  * `axios`: For HTTP requests.
  * `typescript`: Explicit dev dependency.
  * `jest`, `ts-jest`, `@types/*`: Explicit dev dependencies.

## 2. Configuration (Standalone)

* **TypeScript:** `tsconfig.json` configured specifically for this package (Strict Mode, NodeNext/ESNext).
* **Build:** Use `tsc` or `tsup` locally to generate `dist/` (CJS & ESM) without relying on root build tools.

## 3. Core Architecture (Unchanged)

The internal architecture remains the same to meet the functional requirements:

* **Modules:** `ApifyClient`, `HttpClient`, `ActorClient`, `RunClient`, `DatasetClient`.
* **Features:** Token auth, Typed interfaces, Event emitters for logs, Pagination helper.

## 4. Implementation Steps

1. **Init:** Initialize standalone project in `packages/apify_ts`.
2. **Core:** Implement `ApifyClient` and `HttpClient` with `axios`.
3. **Features:** Implement Actors, Runs, and Datasets modules with strong typing.
4. **Testing:** Setup independent Jest environment and write tests.
5. **Docs:** Create a self-contained `README.md`.

## 5. Verification

* Run `npm install` (or `pnpm install`) *inside* the package directory to verify isolation.
* Run tests and build commands locally within the package.

This approach ensures the package is portable and does not depend on the `instascraper-monorepo` settings.
