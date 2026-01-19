# TipTap Rich Template Editor

A WYSIWYG rich text editor for FiestaBoard templates with inline visualization of all template features.

## Features

- **Visual Template Editing**: See variables, colors, symbols, and fill_space inline
- **WYSIWYG**: Shows exactly what will appear on the physical FiestaBoard
- **Hardware-Aware**: Respects FiestaBoard character set (codes 0-71)
- **Interactive Nodes**: Click to delete, drag to reorder
- **Real-time Metrics**: Character counts and overflow warnings
- **Alignment Support**: Left, center, right alignment per line
- **Filter Visualization**: See |pad:3, |wrap filters on variables

## Usage

### Basic Usage

```tsx
import { TipTapLineEditor } from '@/components/tiptap-template-editor/TipTapLineEditor';

function MyComponent() {
  const [template, setTemplate] = useState('');

  return (
    <TipTapLineEditor
      value={template}
      onChange={setTemplate}
      placeholder="Type or insert variables..."
    />
  );
}
```

### With Toolbar and Metrics

```tsx
import { TipTapTemplateLineEditor } from '@/components/tiptap-template-editor/TipTapTemplateLineEditor';

function MyComponent() {
  return (
    <TipTapTemplateLineEditor
      value={template}
      onChange={setTemplate}
      showToolbar={true}
      showMetrics={true}
    />
  );
}
```

## Template Syntax Support

### Variables
- `{{plugin.field}}` - Basic variable
- `{{plugin.field|pad:3}}` - With filter
- `{{plugin.field|wrap}}` - With wrap filter

### Colors
- `{{red}}`, `{{orange}}`, `{{yellow}}`, `{{green}}`, `{{blue}}`, `{{violet}}`, `{{white}}`, `{{black}}`
- Renders as actual colored tiles matching FiestaBoard colors

### Symbols
- `{sun}` → `*`
- `{cloud}` → `O`
- `{rain}` → `/`
- `{storm}` → `!`
- `{fog}` → `-`
- `{partly}` → `%`
- `{heart}` → `<3` (3 characters!)
- `{x}` → `X`

### Special Variables
- `{{fill_space}}` - Expands to fill remaining line width

### Alignment
- `{left}Line content` (default)
- `{center}Centered content`
- `{right}Right-aligned content`

## Components

### Core Components

- **TipTapLineEditor** - Simple drop-in replacement for TemplateLineEditor
- **TipTapTemplateLineEditor** - Full featured with toolbar and metrics
- **TipTapTemplateEditor** - Base editor component

### Extensions

- **VariableNode** - `{{plugin.field}}` with filters
- **ColorTileNode** - `{{red}}`, `{{blue}}`, etc.
- **FillSpaceNode** - `{{fill_space}}`
- **SymbolNode** - `{sun}`, `{rain}`, etc.
- **TemplateParagraph** - Custom paragraph with alignment

### Utilities

- **serialization.ts** - Parse/serialize template strings
- **length-calculator.ts** - Character counting (matches backend)
- **constants.ts** - Symbol mappings, board dimensions

## Hardware Constraints

FiestaBoard can ONLY display:
- **Letters**: A-Z (uppercase only)
- **Numbers**: 0-9
- **Punctuation**: `! @ # $ ( ) - & = ; : ' " % , . / ? °`
- **Color tiles**: Codes 63-70

**NO emoji, NO Unicode symbols, NO lowercase letters!**

The editor shows EXACT characters that will appear on the physical split-flap display.

## Architecture

### Node Types

All template features are implemented as **inline atom nodes**:
- Non-editable (user can't type inside them)
- Non-splittable (treated as single unit)
- Draggable (can be reordered)
- Deletable (click X button)

### Serialization

Templates are stored in the EXISTING string format:
- No database migration needed
- Backward compatible with old editor
- Serialization happens in editor layer only

### Character Counting

Matches backend logic in `src/templates/engine.py`:
- Color tiles = 1 character
- Variables = maxLength from API
- Symbols = resolved character length
- fill_space = 0 (calculated at render)

## Migration from Old Editor

### Step 1: Feature Flag (Optional)

Add environment variable to enable new editor:

```env
NEXT_PUBLIC_USE_TIPTAP_EDITOR=true
```

### Step 2: Conditional Import

```tsx
const TemplateEditor = process.env.NEXT_PUBLIC_USE_TIPTAP_EDITOR === 'true'
  ? require('@/components/tiptap-template-editor/TipTapLineEditor').TipTapLineEditor
  : require('@/components/template-line-editor').TemplateLineEditor;
```

### Step 3: Gradual Rollout

1. Test with new editor in development
2. Enable for subset of users
3. Monitor for issues
4. Full rollout
5. Remove old editor

## Testing

Run tests:

```bash
npm test -- tiptap
```

Tests cover:
- Template string parsing
- Document serialization
- Round-trip consistency
- Character counting
- Overflow detection

## Development

### Adding New Node Types

1. Create extension in `extensions/`
2. Create NodeView in `node-views/`
3. Add to editor extensions array
4. Update serialization logic
5. Add tests

### Debugging

Enable TipTap devtools:

```tsx
import { EditorContent, useEditor } from '@tiptap/react';

const editor = useEditor({
  // ... config
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: true,
});

console.log('Editor JSON:', editor.getJSON());
console.log('Editor HTML:', editor.getHTML());
```

## Known Limitations

1. **No Enter key**: Fixed 6-line constraint prevents line breaks
2. **No formatting**: No bold, italic, etc. (board doesn't support)
3. **Uppercase only**: Board displays uppercase letters only
4. **Limited punctuation**: Only characters in board's character set

## Resources

- [TipTap Documentation](https://tiptap.dev/docs)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [FiestaBoard Character Codes](../../src/board_chars.py)
- [Template Engine Logic](../../src/templates/engine.py)
