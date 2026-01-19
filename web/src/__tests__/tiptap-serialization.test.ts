/**
 * Tests for TipTap template serialization
 */
import { describe, it, expect } from 'vitest';
import { parseTemplate, serializeTemplate } from '../components/tiptap-template-editor/utils/serialization';

describe('Template Serialization', () => {
  describe('parseTemplate', () => {
    it('parses plain text', () => {
      const template = 'Hello World';
      const doc = parseTemplate(template);
      
      expect(doc.type).toBe('doc');
      expect(doc.content).toHaveLength(6); // Always 6 lines
      expect(doc.content![0].content![0].type).toBe('text');
      expect(doc.content![0].content![0].text).toBe('Hello World');
    });

    it('parses variables', () => {
      const template = '{{weather.temp}}';
      const doc = parseTemplate(template);
      
      const firstNode = doc.content![0].content![0];
      expect(firstNode.type).toBe('variable');
      expect(firstNode.attrs?.pluginId).toBe('weather');
      expect(firstNode.attrs?.field).toBe('temp');
    });

    it('parses variables with filters', () => {
      const template = '{{weather.temp|pad:3}}';
      const doc = parseTemplate(template);
      
      const firstNode = doc.content![0].content![0];
      expect(firstNode.type).toBe('variable');
      expect(firstNode.attrs?.filters).toEqual([{ name: 'pad', arg: '3' }]);
    });

    it('parses color tiles', () => {
      const template = '{{red}} Alert {{red}}';
      const doc = parseTemplate(template);
      
      const line = doc.content![0].content!;
      expect(line[0].type).toBe('colorTile');
      expect(line[0].attrs?.color).toBe('red');
      expect(line[0].attrs?.code).toBe(63);
      expect(line[1].type).toBe('text');
      expect(line[1].text).toBe(' Alert ');
      expect(line[2].type).toBe('colorTile');
    });

    it('parses fill_space', () => {
      const template = 'Left{{fill_space}}Right';
      const doc = parseTemplate(template);
      
      const line = doc.content![0].content!;
      expect(line[0].text).toBe('Left');
      expect(line[1].type).toBe('fillSpace');
      expect(line[2].text).toBe('Right');
    });

    it('parses symbols', () => {
      const template = '{sun} Sunny {rain} Rainy';
      const doc = parseTemplate(template);
      
      const line = doc.content![0].content!;
      expect(line[0].type).toBe('symbol');
      expect(line[0].attrs?.symbol).toBe('sun');
      expect(line[0].attrs?.character).toBe('*');
      expect(line[1].text).toBe(' Sunny ');
      expect(line[2].type).toBe('symbol');
      expect(line[2].attrs?.symbol).toBe('rain');
      expect(line[2].attrs?.character).toBe('/');
    });

    it('parses alignment directives', () => {
      const template = '{center}Centered Text';
      const doc = parseTemplate(template);
      
      expect(doc.content![0].attrs?.alignment).toBe('center');
      expect(doc.content![0].content![0].text).toBe('Centered Text');
    });

    it('pads to 6 lines', () => {
      const template = 'Line 1\nLine 2';
      const doc = parseTemplate(template);
      
      expect(doc.content).toHaveLength(6);
      expect(doc.content![0].content).toHaveLength(1);
      expect(doc.content![1].content).toHaveLength(1);
      expect(doc.content![2].content).toEqual([]);
      expect(doc.content![3].content).toEqual([]);
    });

    it('truncates to 6 lines', () => {
      const template = 'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8';
      const doc = parseTemplate(template);
      
      expect(doc.content).toHaveLength(6);
    });
  });

  describe('serializeTemplate', () => {
    it('serializes plain text', () => {
      const doc = parseTemplate('Hello World');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('Hello World');
    });

    it('serializes variables', () => {
      const doc = parseTemplate('{{weather.temp}}');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('{{weather.temp}}');
    });

    it('serializes variables with filters', () => {
      const doc = parseTemplate('{{weather.temp|pad:3}}');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('{{weather.temp|pad:3}}');
    });

    it('serializes color tiles', () => {
      const doc = parseTemplate('{{red}} Alert');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('{{red}} Alert');
    });

    it('serializes fill_space', () => {
      const doc = parseTemplate('A{{fill_space}}B');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('A{{fill_space}}B');
    });

    it('serializes symbols', () => {
      const doc = parseTemplate('{sun} {rain}');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('{sun} {rain}');
    });

    it('serializes alignment', () => {
      const doc = parseTemplate('{center}Centered');
      const serialized = serializeTemplate(doc);
      
      expect(serialized.split('\n')[0]).toBe('{center}Centered');
    });

    it('always produces 6 lines', () => {
      const doc = parseTemplate('One line');
      const serialized = serializeTemplate(doc);
      
      const lines = serialized.split('\n');
      expect(lines).toHaveLength(6);
      expect(lines[0]).toBe('One line');
      expect(lines[1]).toBe('');
      expect(lines[5]).toBe('');
    });
  });

  describe('Round-trip consistency', () => {
    it('maintains plain text', () => {
      const original = 'Hello\nWorld\n\n\n\n';
      const doc = parseTemplate(original);
      const serialized = serializeTemplate(doc);
      
      expect(serialized).toBe(original);
    });

    it('maintains complex template', () => {
      const original = '{{red}} {{weather.temp|pad:3}}F\n{sun} {rain}\nLeft{{fill_space}}Right\n{center}Centered\n\n';
      const doc = parseTemplate(original);
      const serialized = serializeTemplate(doc);
      
      expect(serialized).toBe(original);
    });
  });
});
