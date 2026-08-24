# App extensions

## 1. Scaffold the app

```sh
cd apps
pnpm create @youcan/app@latest
```

Prompts for app name, creates `apps/<your-app-name>` w/ `youcan.app.json`, links it to Partners dashboard.

## 2. Generate an extension

```sh
cd <your-app-name>
youcan app generate extension
```

Adds extension boilerplate inside the app (block, theme extension, whatever type picked).

## 3. Build extension locally

```sh
pnpm run dev
```

Syncs local files to a dev session on your dev store. Live preview, no live stores touched.

## 4. Commit a changeset

```sh
pnpm changeset
```

## 5. Preview (optional)

```sh
youcan app deploy --no-release --version "pr-preview"
```

Creates an unreleased version so a reviewer can interact with it.

## 7. Verify / rollback if needed

```sh
youcan app versions
```

Confirm new version active. If something breaks:

```sh
youcan app release --version <old-number>
```

Rolls back instantly. Seller block placements and settings survive.
