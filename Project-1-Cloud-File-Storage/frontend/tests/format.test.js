import { describe, it, expect } from 'vitest';
import { formatBytes, iconFor } from '../src/components/format.js';

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('iconFor', () => {
  it('returns an image icon for image mime types', () => {
    expect(iconFor('image/png')).toBe('🖼️');
  });

  it('returns a pdf icon for pdf mime types', () => {
    expect(iconFor('application/pdf')).toBe('📕');
  });

  it('falls back to a generic icon for unknown types', () => {
    expect(iconFor('application/octet-stream')).toBe('📁');
  });
});
