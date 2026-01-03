# Images Directory

This directory contains screenshots and images used in the main README.md file to showcase FiestaBoard.

## Purpose

Images in this folder are displayed in the main README to:
- Show the board displays in action
- Demonstrate the web UI interface
- Provide visual examples of different plugins
- Make the project more appealing to potential users

## Plugin-Specific Images

**Note:** Plugin-specific images should be stored in each plugin's `docs/` directory, not here. For example:
- `plugins/weather/docs/weather-display.png`
- `plugins/stocks/docs/stocks-display.png`

This directory is for **general platform images** only (web UI, architecture diagrams, etc.).

## Naming Conventions

Use descriptive, lowercase filenames with hyphens:
- `web-ui-home.png` - Web UI screenshot
- `integrations-page.png` - Integrations/plugins page
- `template-editor.png` - Template editing interface

## Image Guidelines

- **Format**: PNG recommended for screenshots (better quality for text)
- **Size**: Keep file sizes reasonable (<500KB when possible)
- **Dimensions**: Use consistent aspect ratios for similar image types
- **Optimization**: Compress images before committing to reduce repository size

## Adding New Images

1. Take or create the screenshot/image
2. Optimize the image (compress if needed)
3. Save with a descriptive filename following the naming convention
4. Update README.md to reference the new image using relative path: `![Description](./images/filename.png)`

For plugin images, add them to the plugin's `docs/` directory and reference from the plugin's SETUP.md.

