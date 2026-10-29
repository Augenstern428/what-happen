import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractAssignedJson } from '../utils/extract-assignment.mjs'

test('extracts multiline Apollo JSON with escaped quotes, braces in strings and subsequent scripts', () => {
  const data = { defaultClient: { ROOT_QUERY: { 'visionHotRank({"page":"home"})': { id: 'rank' } }, rank: { items: [{ id: 'item' }] }, item: { name: 'topic } ; window.', quoted: 'a "quote" and \\ slash' } } }
  const html = `<script>window.__APOLLO_STATE__ = ${JSON.stringify(data, null, 2)};window.__APP__=true;</script>`
  assert.deepEqual(JSON.parse(extractAssignedJson(html, '__APOLLO_STATE__')), data)
})

test('missing or truncated assignments do not return partial JSON', () => {
  assert.equal(extractAssignedJson('<script>window.other = {};</script>', '__APOLLO_STATE__'), undefined)
  assert.equal(extractAssignedJson('window.__APOLLO_STATE__ = {"a":{"b":1}', '__APOLLO_STATE__'), undefined)
})
