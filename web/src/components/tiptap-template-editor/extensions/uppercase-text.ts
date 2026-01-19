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
    return [
      {
        key: 'uppercaseText',
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr;
          let modified = false;

          // Only process if there's actual content change
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          newState.doc.descendants((node, pos) => {
            if (node.isText) {
              const text = node.text || '';
              const uppercaseText = text.toUpperCase();
              
              if (text !== uppercaseText) {
                tr.replaceWith(
                  pos,
                  pos + node.nodeSize,
                  newState.schema.text(uppercaseText, node.marks)
                );
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      },
    ];
  },
});
