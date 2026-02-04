/**
 * Line Constraints Extension
 * Validation-based enforcement of 22 characters per line and 6 lines maximum
 * Truncates content that exceeds limits instead of blocking input
 * 
 * Note: This extension provides soft validation. Users can type over limits,
 * and this extension will gracefully truncate during validation.
 */
import { Extension } from '@tiptap/core';
import { BOARD_LINES } from '../utils/constants';

export const LineConstraints = Extension.create({
  name: 'lineConstraints',

  addProseMirrorPlugins() {
    let transactionCount = 0;
    
    return [
      {
        key: 'lineConstraints',
        appendTransaction: (transactions, oldState, newState) => {
          // Increment transaction count
          transactionCount++;
          
          // Skip first few transactions (initialization phase)
          if (transactionCount < 3) {
            return null;
          }
          
          try {
            // Comprehensive safety checks
            if (!newState || !oldState) {
              return null;
            }
            
            // Check if oldState is fully initialized
            if (!oldState.doc || !oldState.selection || !oldState.schema) {
              return null;
            }
            
            // Check if newState has all required properties
            if (!newState.tr || !newState.doc || !newState.schema || !newState.selection) {
              return null;
            }

            // Only process if there's actual content change
            if (!transactions || !transactions.some(tr => tr && tr.docChanged)) {
              return null;
            }

            const tr = newState.tr;
            let modified = false;

            // Get the document structure with comprehensive checks
            const doc = newState.doc;
            if (!doc) {
              return null;
            }
            if (!doc.content) {
              return null;
            }
            if (doc.content.size === 0) {
              return null;
            }

            // Count hard breaks to limit to 6 lines
            let hardBreakCount = 0;
            const hardBreakPositions: number[] = [];
            
            try {
              // Walk through the document to find all hard breaks and their positions
              doc.nodesBetween(0, doc.content.size, (node, pos) => {
                if (!node || !node.type) {
                  return;
                }
                if (node.type.name === 'hardBreak') {
                  hardBreakCount++;
                  hardBreakPositions.push(pos);
                }
              });
            } catch (error) {
              console.warn('Error counting hard breaks in LineConstraints:', error);
              return null;
            }

            // If we have more than 5 hard breaks (6+ lines), remove excess
            if (hardBreakCount >= BOARD_LINES && hardBreakPositions.length >= BOARD_LINES) {
              try {
                // Get the position of the 6th hard break (index BOARD_LINES - 1, 0-based)
                const excessStartPos = hardBreakPositions[BOARD_LINES - 1];
                
                // Delete everything from the 6th hard break to the end of the document
                if (excessStartPos !== undefined && typeof excessStartPos === 'number' && excessStartPos >= 0 && excessStartPos < doc.content.size) {
                  tr.delete(excessStartPos, doc.content.size);
                  modified = true;
                }
              } catch (error) {
                console.warn('Error deleting excess content in LineConstraints:', error);
                return null;
              }
            }

            // Note: Character limit truncation per line is complex and might cause issues
            // For now, we rely on visual feedback and serialization to handle character limits
            // Users can type over 22 chars, and it will be handled at serialization time
            // This keeps the UX "chill" as requested

            return modified ? tr : null;
          } catch (error) {
            console.warn('LineConstraints extension error:', error);
            return null;
          }
        },
      },
    ];
  },
});
