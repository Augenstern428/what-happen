import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { favoritesStore, favoriteKey } from './utils/favorites-store.mjs'

test('favorites persist, isolate users, merge concurrent writes and preserve corrupt files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'what-happen-'))
  const item = n => ({ type: 'platform', platform: `p${n}`, platformTitle: `平台${n}`, addedAt: n })
  try {
    await Promise.all([1, 2, 3].map(n => favoritesStore(root, 'alice', { action: 'add', item: item(n) })))
    assert.equal((await favoritesStore(root, 'alice')).length, 3)
    assert.deepEqual(await favoritesStore(root, 'bob'), [])
    await favoritesStore(root, 'alice', { action: 'import', items: [item(1), item(4)] })
    assert.equal((await favoritesStore(root, 'alice')).length, 4)
    await favoritesStore(root, 'alice', { action: 'remove', key: favoriteKey(item(2)) })
    assert.deepEqual((await favoritesStore(root, 'alice')).map(x => x.platform), ['p4', 'p3', 'p1'])
    await assert.rejects(favoritesStore(root, '../escape'))
    const file = join(root, 'alice', '今日时事收藏', 'favorites.json')
    assert.equal(JSON.parse(await readFile(file, 'utf8')).favorites.length, 3)
    await writeFile(file, 'corrupt')
    await assert.rejects(favoritesStore(root, 'alice', { action: 'clear' }))
    assert.equal(await readFile(file, 'utf8'), 'corrupt')
  } finally { await rm(root, { recursive: true, force: true }) }
})
