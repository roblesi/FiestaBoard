/**
 * FillSpaceNode - Inline node for {{fill_space}}
 * Visualizes expandable spacing that fills remaining line width
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FillSpaceNodeView } from '../node-views/FillSpaceNodeView';

export interface FillSpaceAttrs {
  id: string;
  repeatChar?: string;
}

export const FillSpaceNode = Node.create({
  name: 'fillSpace',

  group: 'inline',

  inline: true,

  atom: true, // Single unit, non-editable

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id,
        }),
      },
      repeatChar: {
        default: undefined,
        parseHTML: element => element.getAttribute('data-repeat-char') || undefined,
        renderHTML: attributes => {
          if (attributes.repeatChar) {
            return { 'data-repeat-char': attributes.repeatChar };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="fill-space"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'fill-space' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FillSpaceNodeView);
  },
});
