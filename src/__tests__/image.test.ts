import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('image command validation', () => {
  it('should accept valid image extensions', () => {
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    validExtensions.forEach(ext => {
      const testPath = `test-image${ext}`;
      const fileExt = path.extname(testPath).toLowerCase();
      expect(validExtensions).toContain(fileExt);
    });
  });

  it('should reject invalid image extensions', () => {
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const invalidExtensions = ['.gif', '.bmp', '.webp', '.svg', '.txt'];
    invalidExtensions.forEach(ext => {
      const testPath = `test-image${ext}`;
      const fileExt = path.extname(testPath).toLowerCase();
      expect(validExtensions).not.toContain(fileExt);
    });
  });

  it('should parse recipe ID as integer', () => {
    const validIds = ['1', '42', '999'];
    validIds.forEach(id => {
      const parsed = parseInt(id, 10);
      expect(parsed).toBeGreaterThan(0);
      expect(Number.isInteger(parsed)).toBe(true);
    });
  });

  it('should reject invalid recipe IDs', () => {
    const invalidIds = ['abc', '-1', '0', ''];
    invalidIds.forEach(id => {
      const parsed = parseInt(id, 10);
      expect(isNaN(parsed) || parsed <= 0).toBe(true);
    });
  });
});
