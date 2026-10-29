import axios from "axios";
import {load} from "cheerio"
import {DongCheDiRes} from "~~/server/types/shared";
import {NewsItem} from "tools";

const DONGCHEDI_API = process.env.DONGCHEDI_API || "https://www.dongchedi.com/"
const DONGCHEDI_NEWS_API = process.env.DONGCHEDI_NEWS_API || "https://www.dongchedi.com/"
const DONGCHEDI_FALLBACK_API = "https://www.dongchedi.com/"

export const parseDongCheDiPage = (html: unknown): DongCheDiRes => {
    if (typeof html !== 'string' || !html) throw new Error('Dongchedi returned an empty HTML response')
    const nextData = load(html)('#__NEXT_DATA__').text()
    if (!nextData) throw new Error('Dongchedi page did not contain Next.js data')
    return JSON.parse(nextData) as DongCheDiRes
}

export const dongchediHot = async () => {
    if (!DONGCHEDI_API) {
        throw new Error("DongCheDi API is not set");
    }
    let response = await axios.get(DONGCHEDI_API,{
        timeout: 20000,
        headers:{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        }
    });
    const parse = parseDongCheDiPage(response.data)
    const pageProps = parse.props.pageProps as any
    const hotSearchList = pageProps.hotSearchList ?? []
    if (!hotSearchList.length) throw new Error('Dongchedi hot search data is unavailable')
    return hotSearchList.map((item) => {
        return {
            id: item.gid,
            title: item.title,
            url: `https://www.dongchedi.com/search?keyword=${item.title}`,
            extra: {
                desc: item.description,
                num: item.score
            }
        } as NewsItem
    })
}
export const dongchediNews = async () => {
    if (!DONGCHEDI_NEWS_API) {
        throw new Error("DongCheDi news API is not set");
    }
    const response = await axios.get(DONGCHEDI_NEWS_API,{
        timeout: 20000,
        headers:{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        }
    });
    let parse: DongCheDiRes
    try {
        parse = parseDongCheDiPage(response.data)
    } catch (error) {
        if (DONGCHEDI_NEWS_API === DONGCHEDI_FALLBACK_API) throw error
        const fallback = await axios.get(DONGCHEDI_FALLBACK_API, { headers: { 'User-Agent': genRandomUserAgent() } })
        parse = parseDongCheDiPage(fallback.data)
    }
    const pageProps = parse.props.pageProps as any
    const news = pageProps.staticData?.news ?? pageProps.todayNews?.content_article ?? pageProps.homeOriginal?.video_list ?? []
    if (!Array.isArray(news)) throw new Error('Dongchedi news data has an unexpected format')
    return news.map((item: any) => {
        const id = item.unique_id ?? item.unique_id_str ?? item.gid_str
        const video = item.has_video ?? item.is_video
        return {
            id,
            title: item.title,
            url: video ? `https://www.dongchedi.com/video/${item.unique_id_str ?? id}` : `https://www.dongchedi.com/article/${item.unique_id_str ?? id}`,
            extra: {
                date: (item.publish_time ?? item.publishTime) ? (item.publish_time ?? item.publishTime) * 1000 : undefined
            }
        } as NewsItem
    }).filter((item: NewsItem) => item.id && item.title && item.url)
}
