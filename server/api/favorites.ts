import { favoritesStore } from '../utils/favorites-store.mjs'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const uid = getHeader(event, 'x-hc-user-id')
  // This service is only exposed through the authenticated Lazycat ingress.
  if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw createError({ statusCode: 401, statusMessage: 'Login required' })
  const method = getMethod(event)
  if (!['GET', 'POST'].includes(method)) throw createError({ statusCode: 405 })
  if (method === 'POST') {
    const origin = getHeader(event, 'origin')
    const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host')
    if (origin && new URL(origin).host !== host) throw createError({ statusCode: 403, statusMessage: 'Invalid origin' })
  }
  let operation
  if (method === 'POST') {
    const body = await readRawBody(event)
    if (!body || Buffer.byteLength(body) > 5 * 1024 * 1024) throw createError({ statusCode: 413 })
    try { operation = JSON.parse(body) } catch { throw createError({ statusCode: 400 }) }
    if (!operation || typeof operation !== 'object') throw createError({ statusCode: 400 })
  }
  try {
    const favorites = await favoritesStore(process.env.FAVORITES_DOCUMENTS_ROOT || '/lzcapp/documents', uid, operation)
    return { uid, favorites }
  } catch (error) {
    console.error('收藏读写失败:', error)
    throw createError({ statusCode: 500, statusMessage: 'Favorites storage failed', message: '收藏保存或读取失败，请检查文稿权限及收藏文件' })
  }
})
