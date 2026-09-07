# Repository structure

This repository keeps the public SmartCharts bundle paths at the root for compatibility with existing host applications. The layout below explains what each area contains without requiring consumers to change their URLs.

## Website and deployment

- `index.html` — the public static landing page.
- `vercel.json` — tells Vercel to run the build and serve `dist/`.
- `.github/workflows/build.yml` — validates and packages the repository on pushes, pull requests, and manual runs.

## Root-level generated assets

- `smartcharts.js` and `smartcharts.css` — the primary charting bundle and styles.
- `*-json-*.smartcharts.js` — locale and message bundles.
- `html2canvas-*.smartcharts.js` and `resize-observer-polyfill-*.smartcharts.js` — browser utility bundles.
- `sprite-*.smartcharts.svg` — charting icon and sprite assets.
- `*.LICENSE.txt` — license notices for bundled dependencies.

These files are generated or vendored assets. Keep their existing root paths stable unless the host application and integration documentation are updated together.

## Documentation

- `README.md` — project overview, build commands, and quick-start reference.
- `docs/SMARTCHARTS_INTEGRATION.md` — SmartCharts integration notes and supported indicators.
- `docs/REPOSITORY_STRUCTURE.md` — this file; the maintenance map for the repository.
- `assets/CHART_FEATURES.md` — chart feature reference.
- `LANGUAGE_SUPPORT.md` — supported localization features and translation workflow.
- `LANGUAGE_COMPOSITION.md` — inventory of language and bundled asset composition.

## Source, configuration, and tooling

- `src/deriv-config.js` — Deriv application and WebSocket configuration for the host integration.
- `src/languages/README.md` — language source and translation notes.
- `package.json` — Node.js metadata and the check/build/clean commands.
- `scripts/check-assets.mjs` — validates required bundles, locale assets, and the landing page.
- `scripts/build.mjs` — packages root assets and `index.html` into generated `dist/` output and writes a hash manifest.
- `scripts/clean.mjs` — removes generated `dist/` output.
- `.github/workflows/datadog-synthetics.yml` — existing synthetic monitoring workflow.

## Generated output

- `dist/` — local build output, ignored by Git. It contains copied runtime assets, `index.html`, and `manifest.json` with deterministic file hashes.

## Maintenance rules

1. Preserve root-level bundle filenames and paths for backwards compatibility.
2. Run `npm run check` after changing or adding a bundle or landing page.
3. Run `npm run build` to produce a distributable `dist/` directory.
4. Update the language documentation when adding or changing a locale bundle.
5. Treat bundled files as generated outputs; make source changes in the originating application or build process when available.
6. Keep private credentials and tokens out of tracked configuration files.
7. Update this map when a new top-level directory or asset family is introduced.
