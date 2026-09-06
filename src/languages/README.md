# Language Files Documentation

This directory contains the language localization files for the SmartCharts library integration.

## File Naming Convention

Language files follow the pattern: `{language-code}-json-{hash}.smartcharts.js`

Where:
- `{language-code}` = ISO 639-1 language code (de, es, fr)
- `{hash}` = Webpack chunk hash for cache-busting
- Files are minified webpack chunks from SmartCharts bundle

## Supported Languages

| Language | Code | File Name | Locale |
|----------|------|-----------|--------|
| German | de | de-json-e99a36.smartcharts.js | de-DE |
| Spanish | es | es-json-4bfad7.smartcharts.js | es-ES, es-MX |
| French | fr | fr-json-4c679b.smartcharts.js | fr-FR, fr-CA |

## Language Features

### German (Deutsch) - de-json-e99a36.smartcharts.js
- Trading terminology (Handel, Markt, Kurse)
- Technical indicator names and descriptions
- UI control labels and messages
- Error messages and status updates
- Chart type descriptions

### Spanish (Español) - es-json-4bfad7.smartcharts.js
- Complete Spanish translations
- Latin American Spanish terminology
- Financial market vocabulary
- Technical analysis terms
- User interface translations

### French (Français) - fr-json-4c679b.smartcharts.js
- French language localization
- Technical finance terminology
- Chart and indicator descriptions
- UI element translations
- Help text and tooltips

## Structure

Each language file contains a JSON object with:
```json
{
  "key1": "translated value 1",
  "key2": "translated value 2",
  ...
}
```

## Loading Language Files

Language files are dynamically loaded based on:
1. User's browser language preference
2. User's selected language setting in application
3. Application default locale

## Adding New Languages

To add a new language:
1. Request SmartCharts language pack
2. Name file following convention: `{code}-json-{hash}.smartcharts.js`
3. Add to build configuration
4. Update language selector in application
5. Test with native speakers

## Performance Notes

- Files are minified for production
- Webpack chunk hashes enable cache busting
- Only required language loads in memory
- Lazy-loading supported
