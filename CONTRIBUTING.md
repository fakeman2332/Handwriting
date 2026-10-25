# Contributing and support

Thanks for your interest in Handwriting! This page explains how to get help, report problems and contribute code.

## Getting help

All support goes through GitHub Issues: https://github.com/fakeman2332/handwriting/issues

Before opening a new issue, please search the existing ones: your question may already have an answer. You can write in English or Russian.

## Reporting a bug

Open a new issue and include:

- what you did, step by step;
- what you expected to happen and what happened instead;
- your device, operating system and browser with its version (for example, "iPhone 15, iOS 18, Safari" or "Windows 11, Chrome 141");
- how you draw: mouse, finger or stylus;
- whether the app is installed to the home screen or opened in a browser tab;
- screenshots or a screen recording, if possible;
- for problems with exported files: the format (PNG, PDF, OTF) and the program you opened it in.

If the problem is tied to a particular handwriting, you can attach its backup file (`.hwfont.json`, made with **Backup** on the handwritings list). Keep in mind that issues are public: only attach a backup you are comfortable sharing.

## Lost data

Handwritings are stored only in your browser, so they can't be recovered remotely. If you have a `.hwfont.json` backup, restore it with **Import backup** on the handwritings list. To avoid losing work, make backups regularly, especially on iPhone and iPad.

## Suggesting a feature

Open an issue describing the problem you want to solve and how you imagine the solution. Ideas that are already planned: creating a handwriting from a photo of a filled-in paper template, a quick start with a pangram, exporting the writing animation as a video, and TTF font export.

## Security issues

Please don't describe a vulnerability publicly. Open an issue that only says you have found a security problem, and we will arrange a private way to share the details.

## Contributing code

### Development setup

You need Node.js 22 or newer.

```sh
npm ci
npm run dev        # dev server at http://localhost:5173/
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript in strict mode
npm run lint       # ESLint
npm run build      # production build in dist/
```

The production build uses relative paths, so `dist/` can be served from any folder, for example with `python3 -m http.server` inside `dist`.

To check an exported font, install `fonttools` (`pip install fonttools`) and run `python3 scripts/check_otf.py test-output/sample.otf` after `npm test`.

### Project structure

```text
src/
  app/            routing, layout, Zustand stores
  core/           React-free logic: character sets, metrics, variants, layout, strokes, OTF, backup format
  features/
    fonts/        handwriting list, creation, import
    editor/       drawing canvas, input, undo/redo
    alphabet/     letter grid and progress
    converter/    text input, preview, animation, layout worker
    export/       PNG, PDF, OTF, JSON
  storage/        IndexedDB (Dexie)
  ui/             shared components and styles
  locales/        ru.json, en.json and the typed t() helper
```

`src/core` doesn't depend on React or the DOM, so layout, variant generation and font building are covered by plain unit tests. Inter metrics and outlines are extracted from the bundled font into `src/core/inter-data.json` with `npm run extract:inter`.

### Guidelines

- Keep `src/core` free of React and browser APIs.
- Layout and rendering must stay deterministic: the same text, settings and seed give the same result.
- Add every new interface string to both `src/locales/en.json` and `src/locales/ru.json`; a missing key is a compile error.
- Changes to the backup format must bump `formatVersion` and add a migration in `src/core/format.ts`, so older backups keep importing.
- Add or update tests for behaviour you change.

### Pull requests

1. Fork the repository and create a branch from `master`.
2. Make your change and run `npm run typecheck`, `npm run lint` and `npm test` locally.
3. Open a pull request that explains what changed and why, and link the related issue if there is one. For visual changes, add before and after screenshots.

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
