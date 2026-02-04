/**
 * Uppercase Text Extension
 * Automatically converts all lowercase text to uppercase as the user types
 */
import { Extension } from '@tiptap/core';

export const UppercaseText = Extension.create({
  name: 'uppercaseText',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          textTransform: {
            default: 'uppercase',
            parseHTML: element => element.style.textTransform || 'uppercase',
            renderHTML: attributes => {
              if (!attributes.textTransform || attributes.textTransform === 'uppercase') {
                return {};
              }
              return {
                style: `text-transform: ${attributes.textTransform}`,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    let isInitialized = false;
    let transactionCount = 0;
    
    return [
      {
        key: 'uppercaseText',
        appendTransaction: (transactions, oldState, newState) => {
          // Increment transaction count
          transactionCount++;
          
          // Early return with comprehensive safety checks - prevent any access during initialization
          if (!newState || !oldState) {
            return null;
          }
          
          // Skip first few transactions (initialization phase)
          // Only start processing after editor is fully set up
          if (transactionCount < 3) {
            return null;
          }
          
          // Check if oldState is fully initialized (must have doc, selection, schema)
          if (!oldState.doc || !oldState.selection || !oldState.schema) {
            return null;
          }
          
          // Check if newState has all required properties
          if (!newState.tr || !newState.doc || !newState.schema || !newState.selection) {
            return null;
          }
          
          // Mark as initialized after we've passed all checks
          if (!isInitialized) {
            isInitialized = true;
          }
          
          try {

            // Only process if there's actual content change
            if (!transactions || transactions.length === 0) {
              return null;
            }
            
            // Check if any transaction actually changed the document
            const hasDocChange = transactions.some(tr => tr && tr.docChanged);
            if (!hasDocChange) {
              return null;
            }

            // Safety check: ensure doc exists and is valid
            if (!newState.doc || !newState.doc.content) {
              return null;
            }

            const tr = newState.tr;
            let modified = false;

            newState.doc.descendants((node, pos) => {
              if (!node || !node.isText) {
                return;
              }
              
              try {
                const text = node.text || '';
                if (!text) {
                  return;
                }
                
                const uppercaseText = text.toUpperCase();
                
                if (text !== uppercaseText) {
                  // Safety check before replace
                  if (pos >= 0 && pos < newState.doc.content.size && newState.schema) {
                    tr.replaceWith(
                      pos,
                      pos + node.nodeSize,
                      newState.schema.text(uppercaseText, node.marks || [])
                    );
                    modified = true;
                  }
                }
              } catch (error) {
                // Silently skip this node if there's an error
                console.warn('Error processing text node in UppercaseText:', error);
              }
            });

            return modified ? tr : null;
          } catch (error) {
            console.warn('UppercaseText extension error:', error);
            return null;
          }
        },
      },
    ];
  },
});
