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
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter key: split line if it has content, move to next line if empty
      'Enter': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Get the current paragraph node
        const currentParagraph = $from.node($from.depth);
        const paragraphCount = state.doc.content.childCount;
        
        // Check if current paragraph has content (text or nodes)
        const hasContent = currentParagraph.content.size > 0;
        
        // If we're at the 6-line limit, check if last line is empty
        if (paragraphCount >= 6) {
          // Get the last paragraph (6th line)
          const lastParagraph = state.doc.lastChild;
          const lastLineIsEmpty = lastParagraph && lastParagraph.content.size === 0;
          
          // If last line is empty, delete it and then perform Enter action
          if (lastLineIsEmpty) {
            // Use editor command to delete the last node
            // First, move selection to the last paragraph
            const lastIndex = state.doc.childCount - 1;
            let lastPos = 1;
            for (let i = 0; i < lastIndex; i++) {
              lastPos += state.doc.child(i).nodeSize;
            }
            
            // Select the last paragraph and delete it
            const tr = state.tr;
            tr.setSelection(state.selection.constructor.near(state.doc.resolve(lastPos + 1)));
            tr.deleteSelection();
            editor.view.dispatch(tr);
            
            // Now perform the Enter action based on current line content
            // Use setTimeout to let state update, then perform split
            if (hasContent) {
              setTimeout(() => {
                // Check if split would exceed 6 lines
                const currentCount = editor.state.doc.content.childCount;
                if (currentCount >= 6) {
                  return; // Don't split if already at 6 lines
                }
                
                const result = editor.commands.splitBlock();
                
                // Safety check: if we somehow exceeded 6 lines, trim back
                const afterCount = editor.state.doc.content.childCount;
                if (afterCount > 6) {
                  // Remove excess lines
                  const tr = editor.state.tr;
                  let pos = 1;
                  for (let i = 0; i < 5; i++) {
                    pos += editor.state.doc.child(i).nodeSize;
                  }
                  // Delete from 6th line onwards
                  const excessStart = pos;
                  tr.delete(excessStart, editor.state.doc.content.size);
                  editor.view.dispatch(tr);
                }
              }, 0);
              return true;
            } else {
              // Current line is empty, move to next line (which is now available)
              setTimeout(() => {
                const newState = editor.state;
                const { selection } = newState;
                const { $from: new$from } = selection;
                
                // Find next paragraph position
                let nextPos = new$from.after(new$from.depth);
                if (nextPos < newState.doc.content.size) {
                  nextPos = nextPos + 1;
                  editor.commands.setTextSelection(nextPos);
                }
              }, 0);
              return true;
            }
          }
          
          // Last line has content, so we can't add more lines
          // Block Enter completely when at 6 lines and last line has content
          return true; // Block Enter - can't split when all 6 lines have content
        }
        
        // Under 6 lines - normal behavior
        // If paragraph has content, split it (but check we won't exceed 6)
        if (hasContent) {
          // Only allow split if we're under 6 lines (splitting at 5 lines creates 6)
          if (paragraphCount < 6) {
            const result = editor.commands.splitBlock();
            
            // Safety check after split
            const afterCount = editor.state.doc.content.childCount;
            if (afterCount > 6) {
              // Remove excess
              const tr = editor.state.tr;
              let pos = 1;
              for (let i = 0; i < 5; i++) {
                pos += editor.state.doc.child(i).nodeSize;
              }
              tr.delete(pos, editor.state.doc.content.size);
              editor.view.dispatch(tr);
            }
            return result;
          }
          return true; // Block if already at 6
        }
        
        // If paragraph is empty, move to next line
        // Find current paragraph index
        let currentIndex = 0;
        state.doc.forEach((node, offset) => {
          if (offset < $from.pos && node.type.name === 'templateParagraph') {
            currentIndex++;
          }
        });
        
        // If we're not on the last line, move to the next line
        if (currentIndex < 5) {
          // Find the start of the next paragraph
          let nextPos = $from.after($from.depth);
          if (nextPos < state.doc.content.size) {
            nextPos = nextPos + 1; // Move into the next paragraph
            editor.commands.focus();
            editor.commands.setTextSelection(nextPos);
            return true;
          }
        }
        
        return true;
      },
      'Shift-Enter': () => true, // Always block shift-enter (hard breaks)
    };
  },
});
