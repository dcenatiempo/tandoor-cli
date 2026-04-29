import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as { version: string };

describe('package.json version', () => {
  it('matches semver pattern \\d+.\\d+.\\d+', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
