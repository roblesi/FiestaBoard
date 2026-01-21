/**
 * Custom paragraph node for template lines
 * Supports alignment attribute: left, center, right
 */
import Paragraph from '@tiptap/extension-paragraph';

export type LineAlignment = 'left' | 'center' | 'right';

export const TemplateParagraph = Paragraph.extend({
  name: 'templateParagraph',

  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment') || 'left',
        renderHTML: attributes => {
          const alignment = attributes.alignment || 'left';
          return {
            'data-alignment': alignment,
            style: `text-align: ${alignment};`,
          };
        },
      },
      wrapEnabled: {
        default: false,
        parseHTML: element => element.getAttribute('data-wrap-enabled') === 'true',
        renderHTML: attributes => {
          if (attributes.wrapEnabled) {
            return {
              'data-wrap-enabled': 'true',
            };
          }
          return {};
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter key: move to next line (or wrap to first line if on last)
      'Enter': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Get current paragraph node
        const currentParagraph = $from.node($from.depth);
        if (currentParagraph.type.name !== 'templateParagraph') {
          return false; // Not in a template paragraph, let default behavior handle it
        }
        
        // Find current paragraph index in document
        let currentIndex = 0;
        let pos = 1;
        
        for (let i = 0; i < state.doc.childCount; i++) {
          const node = state.doc.child(i);
          if (node.type.name === 'templateParagraph') {
            if (pos <= $from.pos && $from.pos < pos + node.nodeSize) {
              // Found current paragraph at index currentIndex
              const nextIndex = (currentIndex + 1) % 6;
              
              // Find the next paragraph
              let nextParagraphCount = 0;
              let nextPos = 1;
              
              for (let j = 0; j < state.doc.childCount; j++) {
                const nextNode = state.doc.child(j);
                if (nextNode.type.name === 'templateParagraph') {
                  if (nextParagraphCount === nextIndex) {
                    // Found next paragraph - move cursor to start
                    editor.commands.setTextSelection(nextPos + 1);
                    return true;
                  }
                  nextParagraphCount++;
                }
                nextPos += nextNode.nodeSize;
              }
              
              // Shouldn't reach here, but if we do, wrap to first
              editor.commands.setTextSelection(2);
              return true;
            }
            currentIndex++;
          }
          pos += node.nodeSize;
        }
        
        // Fallback: use $from.after to move to next paragraph
        const afterPos = $from.after($from.depth);
        if (afterPos < state.doc.content.size) {
          editor.commands.setTextSelection(afterPos + 1);
          return true;
        }
        
        // Last resort: wrap to first line
        editor.commands.setTextSelection(2);
        return true;
      },
      'Shift-Enter': () => true, // Always block shift-enter (hard breaks)
    };
  },
});
