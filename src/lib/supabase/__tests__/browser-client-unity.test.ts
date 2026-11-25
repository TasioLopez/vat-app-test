import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

describe('browser Supabase client unity', () => {
  it('browser.ts uses default two-arg createBrowserClient (no custom cookies)', () => {
    const src = readFileSync(join(dir, '../browser.ts'), 'utf8');
    assert.match(src, /createBrowserClient(?:<Database>)?\(url, key\)/);
    assert.equal(/\bcookies\s*:/.test(src), false);
    assert.equal(/function\s+setAll|setAll\s*\(/.test(src), false);
  });

  it('client.ts delegates to tryCreateBrowserSupabase without hand-rolled setAll', () => {
    const src = readFileSync(join(dir, '../client.ts'), 'utf8');
    assert.match(src, /tryCreateBrowserSupabase/);
    assert.equal(src.includes('document.cookie'), false);
    assert.equal(/function\s+setAll|setAll\s*\(/.test(src), false);
    assert.equal(/\bcookies\s*:/.test(src), false);
  });

  it('server.ts uses getAll/setAll cookie adapters', () => {
    const src = readFileSync(join(dir, '../server.ts'), 'utf8');
    assert.match(src, /getAll\s*\(/);
    assert.match(src, /setAll\s*\(/);
    assert.equal(/\bcookies:\s*\{\s*get\s*\(/.test(src), false);
  });
});
