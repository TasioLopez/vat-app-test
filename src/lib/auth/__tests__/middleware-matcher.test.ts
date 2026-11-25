import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MIDDLEWARE_MATCHER } from '../middleware-matcher';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('MIDDLEWARE_MATCHER', () => {
  it('includes root and MFA paths for cold-tab session refresh', () => {
    assert.ok(MIDDLEWARE_MATCHER.includes('/'));
    assert.ok(MIDDLEWARE_MATCHER.includes('/mfa/:path*'));
    assert.ok(MIDDLEWARE_MATCHER.includes('/dashboard/:path*'));
    assert.ok(MIDDLEWARE_MATCHER.includes('/login'));
  });

  it('middleware config.matcher is a static literal matching MIDDLEWARE_MATCHER', () => {
    const src = readFileSync(join(repoRoot, 'middleware.ts'), 'utf8');
    // Next.js rejects spreads/imports in config.matcher — keep a literal array.
    assert.equal(src.includes('matcher: [...MIDDLEWARE_MATCHER]'), false);
    assert.match(src, /export const config = \{\s*matcher: \[/);
    for (const path of MIDDLEWARE_MATCHER) {
      assert.ok(
        src.includes(`'${path}'`) || src.includes(`"${path}"`),
        `middleware config.matcher missing ${path}`
      );
    }
  });

  it('middleware source uses getAll/setAll (not deprecated get/set/remove)', () => {
    const src = readFileSync(join(repoRoot, 'middleware.ts'), 'utf8');
    assert.match(src, /getAll\s*\(/);
    assert.match(src, /setAll\s*\(/);
    assert.equal(/\bcookies:\s*\{[^}]*\bget\s*\(name/.test(src), false);
    assert.equal(src.includes('remove(name'), false);
  });
});
