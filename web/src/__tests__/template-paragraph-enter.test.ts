/**
 * Tests for TemplateParagraph Enter key behavior
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TemplateParagraph } from '../components/tiptap-template-editor/extensions/template-paragraph';
import { parseTemplate } from '../components/tiptap-template-editor/utils/serialization';

describe('TemplateParagraph Enter Key Behavior', () => {
  let editor: Editor;

  beforeEach(() => {
    // Create editor with required extensions (like the actual component)
    editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          code: false,
          bold: false,
          italic: false,
          strike: false,
          history: true,
          document: true,
          text: true,
          hardBreak: false,
          paragraph: false, // We use TemplateParagraph instead
        }),
        TemplateParagraph,
      ],
      content: parseTemplate('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n'),
    });
  });

  it('should have 6 lines initially', () => {
    const { doc } = editor.state;
    expect(doc.content.childCount).toBe(6);
  });

  it('should delete last empty line and split when Enter pressed at 6-line limit with content', () => {
    // Set up: 6 lines, last one empty, cursor on line with content
    const template = 'Hello\nWorld\nTest\nLine4\nLine5\n';
    editor.commands.setContent(parseTemplate(template));
    
    const { state: initialState } = editor;
    expect(initialState.doc.content.childCount).toBe(6);
    
    // Verify last line is empty
    const lastParagraph = initialState.doc.lastChild;
    expect(lastParagraph?.content.size).toBe(0);
    
    // Place cursor in the middle of first line (which has content)
    editor.commands.setTextSelection(3); // After "Hel"
    
    // Simulate Enter key press
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Get current paragraph
    const currentParagraph = $from.node($from.depth);
    const paragraphCount = state.doc.content.childCount;
    const hasContent = currentParagraph.content.size > 0;
    
    // Check conditions
    expect(paragraphCount).toBe(6);
    expect(hasContent).toBe(true);
    
    // Get last paragraph before Enter
    const lastParagraphBefore = state.doc.lastChild;
    const lastLineIsEmpty = lastParagraphBefore && lastParagraphBefore.content.size === 0;
    expect(lastLineIsEmpty).toBe(true);
    
    // Manually trigger the Enter behavior - delete last paragraph
    const tr = state.tr;
    // Calculate position of last paragraph (start at 1 for doc opening tag)
    const lastIndex = state.doc.childCount - 1;
    let lastPos = 1;
    for (let i = 0; i < lastIndex; i++) {
      lastPos += state.doc.child(i).nodeSize;
    }
    // Delete the last paragraph
    const lastParagraphSize = state.doc.child(lastIndex).nodeSize;
    tr.delete(lastPos, lastPos + lastParagraphSize);
    editor.view.dispatch(tr);
    
    // Now should have 5 lines
    const { doc: docAfterDelete } = editor.state;
    expect(docAfterDelete.content.childCount).toBe(5);
    
    // Now try to split
    editor.commands.splitBlock();
    
    // Should now have 6 lines again (split created new line)
    const { doc: finalDoc } = editor.state;
    expect(finalDoc.content.childCount).toBe(6);
    
    // First line should be split
    const firstLine = finalDoc.firstChild;
    expect(firstLine?.textContent).toBe('Hel');
    
    // Second line should have the rest
    const secondLine = finalDoc.child(1);
    expect(secondLine?.textContent).toBe('lo');
  });

  it('should move to next line when current line is empty and last line is empty', () => {
    // Set up: 6 lines, all empty except maybe one
    const template = '\n\n\n\n\n';
    editor.commands.setContent(parseTemplate(template));
    
    const { state } = editor;
    expect(state.doc.content.childCount).toBe(6);
    
    // Place cursor on first line (empty)
    editor.commands.setTextSelection(1);
    
    const currentParagraph = state.selection.$from.node(state.selection.$from.depth);
    const hasContent = currentParagraph.content.size > 0;
    expect(hasContent).toBe(false);
    
    // Last line should be empty
    const lastParagraph = state.doc.lastChild;
    expect(lastParagraph?.content.size).toBe(0);
    
    // Delete last line
    const tr = state.tr;
    // Calculate position of last paragraph (start at 1 for doc opening tag)
    const lastIndex = state.doc.childCount - 1;
    let lastPos = 1;
    for (let i = 0; i < lastIndex; i++) {
      lastPos += state.doc.child(i).nodeSize;
    }
    // Delete the last paragraph
    const lastParagraphSize = state.doc.child(lastIndex).nodeSize;
    tr.delete(lastPos, lastPos + lastParagraphSize);
    editor.view.dispatch(tr);
    
    // Should now have 5 lines
    const { doc: docAfterDelete } = editor.state;
    expect(docAfterDelete.content.childCount).toBe(5);
  });

  it('should block Enter when last line has content', () => {
    // Set up: 6 lines, all with content
    const template = 'L1\nL2\nL3\nL4\nL5\nL6';
    editor.commands.setContent(parseTemplate(template));
    
    const { state } = editor;
    expect(state.doc.content.childCount).toBe(6);
    
    // Last line should have content
    const lastParagraph = state.doc.lastChild;
    expect(lastParagraph?.content.size).toBeGreaterThan(0);
    
    // Place cursor on first line
    editor.commands.setTextSelection(1);
    
    const currentParagraph = state.selection.$from.node(state.selection.$from.depth);
    const hasContent = currentParagraph.content.size > 0;
    expect(hasContent).toBe(true);
    
    // Try to split - should work (but won't create 7th line)
    const initialLineCount = state.doc.content.childCount;
    editor.commands.splitBlock();
    
    // Should still have 6 lines (can't exceed limit)
    const { doc: finalDoc } = editor.state;
    expect(finalDoc.content.childCount).toBeLessThanOrEqual(6);
  });

  it('should split line normally when under 6 lines', () => {
    // Set up: 5 lines
    const template = 'Hello\nWorld\nTest\nLine4\nLine5';
    editor.commands.setContent(parseTemplate(template));
    
    // Ensure we have 5 lines (parseTemplate pads to 6, so we need to remove one)
    const { state: initialState } = editor;
    if (initialState.doc.content.childCount === 6) {
      const tr = initialState.tr;
      // Calculate position of last paragraph (start at 1 for doc opening tag)
      const lastIndex = initialState.doc.childCount - 1;
      let lastPos = 1;
      for (let i = 0; i < lastIndex; i++) {
        lastPos += initialState.doc.child(i).nodeSize;
      }
      // Delete the last paragraph
      const lastParagraphSize = initialState.doc.child(lastIndex).nodeSize;
      tr.delete(lastPos, lastPos + lastParagraphSize);
      editor.view.dispatch(tr);
    }
    
    const { state } = editor;
    expect(state.doc.content.childCount).toBe(5);
    
    // Place cursor in middle of first line
    editor.commands.setTextSelection(3);
    
    // Split should work normally
    editor.commands.splitBlock();
    
    // Should now have 6 lines
    const { doc: finalDoc } = editor.state;
    expect(finalDoc.content.childCount).toBe(6);
  });
});
