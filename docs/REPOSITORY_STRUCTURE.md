# Repository structure

This repository keeps the public SmartCharts bundle paths at the root for compatibility with existing host applications. The layout below explains what each area contains without requiring consumers to change their URLs.

## Root-level generated assets

- `smartcharts.js` and `smartcharts.css` — the primary charting bundle and styles.
- `*-json-*.smartcharts.js` — locale and message bundles.
- `html2canvas-*.smartcharts.js` and `resize-observer-polyfill-*.smartcharts.js` — browser utility bundles.
- `sprite-*.smartcharts.svg` — charting icon and sprite assets.
- `*.LICENSE.txt` — license notices for bundled dependencies.

These files are generated or vendored assets. Keep their existing root paths stable unless the host application and integration documentation are updated together.

## Documentation

- `README.md` — project overview and quick-start reference.
- `docs/SMARTCHARTS_INTEGRATION.md` — SmartCharts integration notes and supported indicators.
- `docs/REPOSITORY_STRUCTURE.md` — this file; the maintenance map for the repository.
- `assets/CHART_FEATURES.md` — chart feature reference.
- `LANGUAGE_SUPPORT.md` — supported localization features and translation workflow.
- `LANGUAGE_COMPOSITION.md` — inventory of language and bundled asset composition.

## Source and configuration

- `src/deriv-config.js` — Deriv application and WebSocket configuration for the host integration.
- `src/languages/README.md` — language source and translation notes.
- `.github/workflows/` — repository automation and synthetic checks.

## Maintenance rules

1. Preserve root-level bundle filenames and paths for backwards compatibility.
2. Update the language documentation when adding or changing a locale bundle.
3. Treat bundled files as generated outputs; make source changes in the originating application or build process when available.
4. Keep private credentials and tokens out of tracked configuration files.
5. Update this map when a new top-level directory or asset family is introduced.
