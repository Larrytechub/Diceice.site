# Diceice.site

SmartCharts assets and localization resources for multilingual financial charting and technical analysis interfaces.

## What is included

- `index.html` — the public landing page served by Vercel.
- `smartcharts.js` and `smartcharts.css` — the main bundled charting assets.
- Locale bundles for translated chart labels, indicators, controls, and market messages.
- `html2canvas` and `resize-observer-polyfill` browser utilities.
- `docs/` and language documentation for integration and translation work.
- `src/deriv-config.js` — Deriv application configuration used by the host integration.

## Quick start

Load the bundled JavaScript and CSS from your host application:

    <link rel="stylesheet" href="./smartcharts.css" />
    <script src="./smartcharts.js"></script>

Use the integration guide for the host application setup and chart configuration:

- [SmartCharts integration guide](docs/SMARTCHARTS_INTEGRATION.md)
- [Language support](LANGUAGE_SUPPORT.md)
- [Language composition](LANGUAGE_COMPOSITION.md)

## Website deployment

The repository includes a static landing page and `vercel.json` configuration. Vercel runs `npm run build`, serves the generated `dist/` directory, and receives an `index.html` entrypoint instead of a 404 at `/`.

## Repository layout

Generated SmartCharts assets intentionally remain at the repository root so existing host applications can keep their current paths. See the [repository structure map](docs/REPOSITORY_STRUCTURE.md) for the role of each directory and the maintenance rules.

## Development and build

The repository uses Node.js 18 or newer and has no external npm dependencies:

    npm run check
    npm run build
    npm run clean

`check` validates that the required bundles and locale assets are present. `build` packages the checked-in root assets and landing page into `dist/` and writes a deterministic `dist/manifest.json` with file sizes and SHA-256 hashes. `dist/` is ignored because it is generated output. The original compiler/source toolchain is not included in this repository.

## Localization

The repository contains locale bundles for Arabic, Bengali, Chinese (simplified and traditional), Dutch, English messages, French, German, Indonesian, Italian, Khmer, Korean, Mongolian, Polish, Portuguese, Russian, Sinhala, Spanish, Swahili, Thai, Turkish, Uzbek, and Vietnamese.

The documented translation system covers chart types, technical indicators, trading terminology, navigation, form controls, error messages, help text, tooltips, and market status notifications.

## Source and generated assets

The root-level SmartCharts files are bundled assets intended to be consumed by a web application. The `src/` directory contains integration configuration and language source files. When changing source data, keep generated bundles and their locale naming conventions consistent. See the [repository structure map](docs/REPOSITORY_STRUCTURE.md) for the full layout.

## Deriv configuration

`src/deriv-config.js` exports the Deriv application ID and WebSocket URL template used by the host integration. Keep private credentials and tokens out of the repository; configure secrets through the host application environment.

## Repository status

This repository contains the public landing page, charting assets, translations, and integration documentation.

## License

No license file is currently included. Confirm the intended license before redistributing these assets.
