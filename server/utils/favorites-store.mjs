import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const queues = new Map()
export function favoriteKey(item) {
  return item.type === 'platform' ? `platform:${item.platform}` : `single:${item.id}:${item.url}`
}
export function validateFavorite(item) {
  if (!item || !['single', 'platform'].includes(item.type) || typeof item.platform !== 'string' || !item.platform || item.platform.length > 200) throw new Error('收藏格式不正确')
  if (typeof item.platformTitle !== 'string' || item.platformTitle.length > 500 || !Number.isFinite(item.addedAt)) throw new Error('收藏格式不正确')
  if (item.type === 'single' && ((!['string', 'number'].includes(typeof item.id)) || typeof item.title !== 'string' || typeof item.url !== 'string' || !/^https?:\/\//i.test(item.url))) throw new Error('新闻格式不正确')
  if (JSON.stringify(item).length > 50000) throw new Error('收藏条目过大')
  return item
}
export async function favoritesStore(root, uid, operation) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new Error('用户标识不正确')
  const file = join(root, uid, '今日时事收藏', 'favorites.json')
  const previous = queues.get(file) || Promise.resolve()
  const task = previous.catch(() => {}).then(async () => {
    let items = []
    try {
      const document = JSON.parse(await readFile(file, 'utf8'))
      if (document.version !== 1 || !Array.isArray(document.favorites)) throw new Error('收藏文件格式不正确，请先恢复备份')
      items = document.favorites.map(validateFavorite)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (!operation) return items
    if (operation.action === 'add' || operation.action === 'import') {
      const incoming = operation.action === 'add' ? [operation.item] : operation.items
      if (!Array.isArray(incoming) || incoming.length > 10000) throw new Error('收藏数量过多')
      const merged = new Map(items.map(item => [favoriteKey(item), item]))
      for (const item of incoming) { validateFavorite(item); if (!merged.has(favoriteKey(item))) merged.set(favoriteKey(item), item) }
      items = [...merged.values()]
    } else if (operation.action === 'remove') {
      if (typeof operation.key !== 'string') throw new Error('缺少收藏标识')
      items = items.filter(item => favoriteKey(item) !== operation.key)
    } else if (operation.action === 'clear') items = []
    else throw new Error('未知的收藏操作')
    if (items.length > 10000) throw new Error('最多保存 10000 条收藏')
    items.sort((a, b) => b.addedAt - a.addedAt)
    await mkdir(join(root, uid, '今日时事收藏'), { recursive: true })
    const temp = `${file}.${randomUUID()}.tmp`
    await writeFile(temp, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), favorites: items }, null, 2), { mode: 0o600 })
    await rename(temp, file)
    return items
  })
  queues.set(file, task)
  try { return await task } finally { if (queues.get(file) === task) queues.delete(file) }
}
