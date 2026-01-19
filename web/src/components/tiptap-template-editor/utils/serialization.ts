/**
 * Template string ↔ TipTap document serialization
 * Handles parsing and serializing template syntax while maintaining compatibility
 */

import { JSONContent } from '@tiptap/react';
import { BOARD_COLORS, SYMBOL_CHARS, FILL_SPACE_VAR } from './constants';

/**
 * Parse a template string into TipTap JSON document
 */
export function parseTemplate(template: string): JSONContent {
  const lines = template.split('\n').slice(0, 6); // Max 6 lines
  
  // Pad to exactly 6 lines
  while (lines.length < 6) {
    lines.push('');
  }

  const content: JSONContent[] = lines.map(line => {
    const { alignment, content: lineContent } = extractAlignment(line);
    
    return {
      type: 'templateParagraph',
      attrs: { alignment },
      content: lineContent ? parseLineContent(lineContent) : [],
    };
  });

  return {
    type: 'doc',
    content,
  };
}

/**
 * Serialize TipTap document back to template string
 */
export function serializeTemplate(doc: JSONContent): string {
  if (!doc.content || doc.content.length === 0) {
    return '\n\n\n\n\n'; // 6 empty lines
  }

  const lines = doc.content.slice(0, 6).map(node => {
    if (node.type !== 'templateParagraph') {
      return '';
    }

    const alignment = node.attrs?.alignment || 'left';
    const content = serializeLineContent(node.content || []);
    
    return applyAlignment(alignment, content);
  });

  // Ensure exactly 6 lines
  while (lines.length < 6) {
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extract alignment directive from line
 */
function extractAlignment(line: string): { alignment: string; content: string } {
  if (line.startsWith('{center}')) {
    return { alignment: 'center', content: line.slice(8) };
  }
  if (line.startsWith('{right}')) {
    return { alignment: 'right', content: line.slice(7) };
  }
  if (line.startsWith('{left}')) {
    return { alignment: 'left', content: line.slice(6) };
  }
  return { alignment: 'left', content: line };
}

/**
 * Apply alignment prefix to content
 */
function applyAlignment(alignment: string, content: string): string {
  // Don't add prefix to empty lines
  if (!content) {
    return '';
  }
  
  switch (alignment) {
    case 'center':
      return `{center}${content}`;
    case 'right':
      return `{right}${content}`;
    default:
      return content;
  }
}

/**
 * Parse line content into TipTap nodes
 * Exported for use in insertion utilities
 */
export function parseLineContent(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Try to match double-bracket tokens {{...}}
    const doubleMatch = remaining.match(/^\{\{([^}]+)\}\}/);
    if (doubleMatch) {
      const content = doubleMatch[1];
      const fullMatch = doubleMatch[0];
      
      // Check if it's a color
      const colorName = content.toLowerCase();
      if (colorName in BOARD_COLORS) {
        nodes.push({
          type: 'colorTile',
          attrs: {
            color: colorName,
            code: BOARD_COLORS[colorName as keyof typeof BOARD_COLORS],
          },
        });
      }
      // Check if it's fill_space
      else if (content.toLowerCase() === FILL_SPACE_VAR) {
        nodes.push({
          type: 'fillSpace',
          attrs: {
            id: Math.random().toString(36).substr(2, 9),
          },
        });
      }
      // Otherwise it's a variable
      else {
        const { varPath, filters } = parseVariable(content);
        const [pluginId, field] = varPath.split('.');
        
        nodes.push({
          type: 'variable',
          attrs: {
            pluginId: pluginId || '',
            field: field || '',
            filters,
          },
        });
      }
      
      remaining = remaining.slice(fullMatch.length);
      continue;
    }

    // Try to match single-bracket tokens {token}
    const singleMatch = remaining.match(/^\{([a-z]+)\}/i);
    if (singleMatch) {
      const tokenName = singleMatch[1].toLowerCase();
      
      // Check if it's a color (single bracket color syntax)
      if (tokenName in BOARD_COLORS) {
        nodes.push({
          type: 'colorTile',
          attrs: {
            color: tokenName,
            code: BOARD_COLORS[tokenName as keyof typeof BOARD_COLORS],
          },
        });
        remaining = remaining.slice(singleMatch[0].length);
        continue;
      }
      
      // Check if it's a symbol
      if (tokenName in SYMBOL_CHARS) {
        nodes.push({
          type: 'symbol',
          attrs: {
            symbol: tokenName,
            character: SYMBOL_CHARS[tokenName],
          },
        });
        remaining = remaining.slice(singleMatch[0].length);
        continue;
      }
    }

    // Plain text - collect until next special token
    const nextToken = remaining.search(/\{\{|\{[a-z]+\}/i);
    if (nextToken === -1) {
      // Rest is plain text
      if (remaining) {
        nodes.push({
          type: 'text',
          text: remaining,
        });
      }
      break;
    } else if (nextToken > 0) {
      // Text before next token
      nodes.push({
        type: 'text',
        text: remaining.slice(0, nextToken),
      });
      remaining = remaining.slice(nextToken);
    } else {
      // Token is at start but didn't match - treat first char as text
      nodes.push({
        type: 'text',
        text: remaining[0],
      });
      remaining = remaining.slice(1);
    }
  }

  return nodes;
}

/**
 * Serialize line content back to string
 */
function serializeLineContent(nodes: JSONContent[]): string {
  return nodes.map(node => {
    switch (node.type) {
      case 'text':
        return node.text || '';
      
      case 'variable':
        const { pluginId, field, filters } = node.attrs || {};
        let varStr = `{{${pluginId}.${field}`;
        if (filters && filters.length > 0) {
          varStr += '|' + filters.map((f: any) => 
            f.arg ? `${f.name}:${f.arg}` : f.name
          ).join('|');
        }
        varStr += '}}';
        return varStr;
      
      case 'colorTile':
        // Use single bracket syntax for colors: {red} instead of {{red}}
        return `{${node.attrs?.color || 'red'}}`;
      
      case 'fillSpace':
        return `{{${FILL_SPACE_VAR}}}`;
      
      case 'symbol':
        return `{${node.attrs?.symbol || 'sun'}}`;
      
      default:
        return '';
    }
  }).join('');
}

/**
 * Parse variable expression with filters
 */
function parseVariable(expr: string): { varPath: string; filters: any[] } {
  const parts = expr.split('|');
  const varPath = parts[0].trim();
  const filters = parts.slice(1).map(f => {
    const colonIndex = f.indexOf(':');
    if (colonIndex === -1) {
      return { name: f.trim() };
    }
    return {
      name: f.slice(0, colonIndex).trim(),
      arg: f.slice(colonIndex + 1).trim(),
    };
  });
  
  return { varPath, filters };
}
