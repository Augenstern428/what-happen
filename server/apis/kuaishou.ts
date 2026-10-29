import {proxyPicture} from "../utils";
import {extractAssignedJson} from "../utils/extract-assignment.mjs";
const KUAISHOU_API = process.env.KUAISHOU_API || "https://www.kuaishou.com/?isHome=1"
export const kuaishou = async () => {
    if (!KUAISHOU_API) {
        throw new Error("快手 API is not set")
    }
    // 获取快手首页HTML
    const response = await fetch(KUAISHOU_API, {
        signal: AbortSignal.timeout(20000),
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cookie": "kpf=PC_WEB; clientid=3; did=web_cee7df9e29754bca0711df605a2477d1; kpn=KUAISHOU_VISION",
            "Referer": "https://www.kuaishou.com/"
        }
    })
    if (!response.ok) throw new Error(`快手请求失败：HTTP ${response.status}`)
    const html = await response.text()
    const state = extractAssignedJson(html, '__APOLLO_STATE__')
    if (!state) throw new Error("无法获取快手热榜数据")

    const data: shared.KuaishouRes = JSON.parse(state)
    const client = data.defaultClient
    const root = client?.ROOT_QUERY
    const hotRankRef = root && Object.entries(root).find(([key]) => key.startsWith('visionHotRank('))?.[1] as { id?: string } | undefined
    const hotRankId = hotRankRef?.id
    const hotRankData = hotRankId ? client[hotRankId] as shared.KuaishouHotRankData | undefined : undefined
    if (!hotRankData?.items?.length) throw new Error('快手热榜列表为空或结构已变化')
    return hotRankData.items.filter(item => {
        const tagType = client[item.id]?.tagType
        return tagType !== '置顶' && client[item.id]?.name
    }).map((item) => {
        // 从id中提取实际的热搜词
        const hotSearchWord = item.id.replace("VisionHotRankItem:", "")

        // 获取具体的热榜项数据
        const hotItem = client[item.id]
        return {
            id: hotSearchWord,
            title: hotItem.name,
            url: `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(hotItem.name)}`,
            extra: {
                icon: {
                    url: hotItem.iconUrl && proxyPicture(hotItem.iconUrl),
                }
            },
        }
    })
}
