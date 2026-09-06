# SmartCharts Integration Guide

This document provides an overview of the SmartCharts library integration in Diceice.site.

## Overview
SmartCharts is a comprehensive library for rendering financial charts with multilingual support. The Diceice.site repository includes localizations for German, Spanish, and French languages.

## Supported Languages

### German (Deutsch)
**File**: `de-json-e99a36.smartcharts.js`

Translations include:
- Chart type labels
- Indicator descriptions
- Control labels
- Error messages
- Market status updates

### Spanish (Español)
**File**: `es-json-4bfad7.smartcharts.js`

Features comprehensive Spanish translations for:
- All UI controls
- Technical indicators
- Market information
- Trading tools

### French (Français)
**File**: `fr-json-4c679b.smartcharts.js`

Provides full French localization for:
- Chart interface
- Technical analysis tools
- Market descriptions
- Control labels

## Technical Analysis Indicators

The following indicators are supported and localized:

1. **Trend Indicators**
   - Moving Averages
   - Bollinger Bands
   - MACD

2. **Momentum Indicators**
   - RSI (Relative Strength Index)
   - Stochastic Oscillator
   - Awesome Oscillator

3. **Directional Indicators**
   - ADX (Average Directional Movement Index)
   - Aroon Up/Down

4. **Volatility Indicators**
   - Bollinger Bands
   - Standard Deviations

## Usage

These language files are automatically loaded based on user locale settings. The library will serve the appropriate localization file for:

- German speakers (de-DE)
- Spanish speakers (es-ES, es-MX, etc.)
- French speakers (fr-FR, fr-CA, etc.)

## Implementation Notes

- Files are webpack-bundled chunks
- Language selection is dynamic
- All strings are centralized in JSON format
- Encoding handles special characters (UTF-8)
