# Multi-Language Support

This document describes the multi-language translation system implemented in Diceice.site.

## Supported Languages

### 1. **German (de-DE)** - de-json-e99a36.smartcharts.js
- Complete German translations for all UI elements
- Technical terms and chart indicators translated
- Currency and number formatting support

### 2. **Spanish (es-ES)** - es-json-4bfad7.smartcharts.js
- Full Spanish translation suite
- Trading and financial terminology
- Regional formatting options

### 3. **French (fr-FR)** - fr-json-4c679b.smartcharts.js
- Comprehensive French localizations
- Technical documentation translations
- Educational content in French

## Language Features

### Chart Indicators & Indicators
- ADX/DMS (Average Directional Movement Index)
- Bollinger Bands
- MACD (Moving Average Convergence Divergence)
- RSI (Relative Strength Index)
- Stochastic Oscillator
- Williams %R
- Aroon Indicator
- And 100+ more technical indicators

### UI Components
- Navigation elements
- Form controls
- Error messages
- Help text and tooltips
- Market status notifications

### Trading Terms
- Market conditions (opened/closed)
- Price feed delays
- Chart types and intervals
- Drawing tools
- Technical analysis descriptions

## Implementation Details

Each language file is a JSON translation map containing:
- **Key**: English identifier
- **Value**: Localized translation

### File Format
```json
{
  "Market is now opened.": "Der Markt ist jetzt geöffnet.",
  "Technical momentum indicator...": "Ein technischer Momentum-Indikator...",
  "Display data for a specific date": "Daten für ein bestimmtes Datum..."
}
```

## Adding New Languages

To add a new language:

1. Create a new translation file: `[lang-code]-json-[hash].smartcharts.js`
2. Copy the structure from an existing language file
3. Translate all key-value pairs
4. Register the language in the language switcher
5. Test all UI elements in the new language

## Character Encoding

- All translation files use UTF-8 encoding
- Special characters and diacritics are properly escaped
- RTL language support available for future expansion

## Performance Considerations

- Lazy loading of language files
- Minimal impact on bundle size
- Efficient dictionary lookups
- Cached translations in browser memory

## Translation Quality

- Professional translations for financial/technical terms
- Consistent terminology across all languages
- Context-aware translations
- Regular updates and improvements

## Support

For translation issues or to contribute translations:
1. Report issues on GitHub
2. Submit translation corrections
3. Suggest new languages to support
