# Safari SVG Fixer for Figma

A Figma plugin that helps fix SVG export issues for Safari compatibility and optimizes file sizes.

## Features

### 1. Effect Fixing

Safari has issues rendering frames with effects (shadows, blurs, etc.) in SVG format. This plugin:

- Removes effects from frames
- Creates a rectangle of the same size behind the frame
- Applies the original effects to the rectangle
- Maintains the exact same visual appearance
- Preserves corner radius and other frame properties

### 2. Image Compression

Optimizes bitmap images within SVGs to reduce file size:

- Automatically detects images in selected frames
- Compresses images while maintaining quality
- Reduces overall SVG file size
- Preserves visual appearance

## How to Use

1. Select the frames you want to process in your Figma document
2. Run the plugin
3. Choose between:
   - "Fix Effects" to handle frame effects
   - "Compress Images" to optimize bitmap images
4. The plugin will process your selection and show the results

## Why Use This Plugin?

- **Safari Compatibility**: Ensures your SVGs render correctly in Safari
- **Smaller File Sizes**: Reduces SVG file size by optimizing embedded images
- **Visual Fidelity**: Maintains the exact same visual appearance while fixing compatibility issues
- **Batch Processing**: Process multiple frames at once

## Installation

1. Open Figma
2. Go to Plugins > Development > Import plugin from manifest
3. Select the `manifest.json` file from this repository

## Development

This plugin is built using Figma's plugin API. The main components are:

- `code.js`: Main plugin logic
- `ui.html`: User interface
- `manifest.json`: Plugin configuration

## License

This project is released under the [Creative Commons CC0 1.0 Universal](LICENSE) license, which effectively places it in the public domain. You can use, modify, and distribute this software for any purpose without restriction.
