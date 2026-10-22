// worker/routes.js: which folder each address serves, and what it must never serve. Run: node --test 'worker/test/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve, SITES } from '../routes.js';

test('a root host serves its folder', () => {
  assert.deepEqual(resolve('ask.anawj.com', '/'), { file: 'ask/' });
  assert.deepEqual(resolve('ask.anawj.com', '/app.js'), { file: 'ask/app.js' });
  assert.deepEqual(resolve('ASK.anawj.com:443', '/'), { file: 'ask/' });
  assert.deepEqual(resolve('ask.anawj.com', '/ask'), { redirect: '/ask/' });
  assert.deepEqual(resolve('ask.anawj.com', '/ask/index.html'), { file: 'ask/index.html' });
});

test('the Obsidian forwarder is served at /o/', () => {
  assert.deepEqual(resolve('ask.anawj.com', '/o/'), { file: 'o/' });
  assert.deepEqual(resolve('ask.anawj.com', '/o/index.html'), { file: 'o/index.html' });
});

test('unknown hosts serve nothing; localhost serves the repo', () => {
  assert.deepEqual(resolve('x.workers.dev', '/ask/'), { notFound: true });
  assert.deepEqual(resolve('other.anawj.com', '/'), { notFound: true });
  assert.deepEqual(resolve('localhost:8787', '/ask/'), { file: 'ask/' });
});

test('nothing escapes its folder', () => {
  for (const p of ['/../wrangler.jsonc', '/%2e%2e/x', '/a%2fb', '/a\\b', '/./x'])
    assert.deepEqual(resolve('ask.anawj.com', p), { notFound: true }, p);
});

test('every folder in SITES exists', () => {
  for (const [host, s] of Object.entries(SITES))
    for (const f of [s.root, ...Object.values(s.prefixes || {})].filter(Boolean))
      assert.ok(fs.existsSync(new URL(`../../${f}`, import.meta.url)), `${host}: ${f}`);
});
