/**
 * Utility functions for inserting template content into TipTap editor
 * at the current cursor position
 */

import { Editor } from '@tiptap/react';
import { parseLineContent } from './serialization';

/**
 * Insert template content at the current cursor position in the editor
 * @param editor - The TipTap editor instance
 * @param templateString - Template string to insert (e.g., "{{weather.temperature}}", "{red}", "{{fill_space}}")
 */
export function insertTemplateContent(
  editor: Editor,
  templateString: string
): void {
  if (!editor) {
    console.warn('Cannot insert content: editor is not available');
    return;
  }

  // Parse the template string into TipTap nodes
  const nodes = parseLineContent(templateString);
  
  if (nodes.length === 0) {
    return;
  }

  // Insert at current cursor position
  editor.chain().focus().insertContent(nodes).run();
}
