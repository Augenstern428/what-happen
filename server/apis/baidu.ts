import type {NewsItem} from '../types'
const BAIDU_API = process.env.BAIDU_API || 'https://top.baidu.com/board?tab=realtime'
const BAIDU_TELEPLAY_API = process.env.BAIDU_TELEPLAY_API || 'https://top.baidu.com/board?tab=teleplay'

import axios from "axios";
import {sanitizeJsonString} from "../utils";
import {BaiduRes, BaiduTeleplayRes} from "~~/server/types/shared";

export const baidu = async () => {
    if (!BAIDU_API) {
        throw new Error("Baidu API is not set")
    }
    const rawData = await axios.get(BAIDU_API,{
        timeout: 20000,
        headers:{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        }
    })
    const jsonStr = typeof rawData.data === 'string' ? rawData.data.match(/<!--s-data:(.*?)-->/s) : null
    if (!jsonStr?.[1]) throw new Error('Failed to find Baidu hot search data')
    const parsed = JSON.parse(sanitizeJsonString(jsonStr[1]))
    const data: BaiduRes = parsed.data?.data ?? parsed.data
    const content = data?.cards?.find(card => Array.isArray(card.content))?.content
    if (!content) throw new Error('Baidu hot search data has an unexpected format')
    return content.filter(k => !k.isTop).map((k) => {
        return {
            id: k.rawUrl,
            title: k.word,
            url: k.rawUrl,
            extra: {
                hover: k.desc,
                rank: k.index,
                num: k.hotScore,
            },
        } as NewsItem
    })
}


export const baiduTeleplay = async () => {
    if (!BAIDU_TELEPLAY_API) {
        throw new Error("Baidu Teleplay API is not set")
    }
    const rawData = await axios.get(BAIDU_TELEPLAY_API,{
        timeout: 20000,
        headers:{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        }
    });
    const jsonStr = (rawData.data as string).match(/<!--s-data:(.*?)-->/);
    if (!jsonStr) {
        throw new Error("Failed to parse Baidu Teleplay data");
    }
    const parsed = JSON.parse(sanitizeJsonString(jsonStr[1]));
    const data: BaiduTeleplayRes = parsed.data?.data ?? parsed.data;
    if (!data?.cards?.[0]?.content) throw new Error("Baidu Teleplay data has an unexpected format");
    return data.cards[0].content.map((k) => {
        return {
            id: k.word,
            title: k.word,
            url: k.url,
            extra: {
                desc: k.desc,
                score: k.hotScore,
                rank: k.index,
                info: Array.isArray(k.show) ? k.show.join("·") : '',
                icon: {
                    url: k.img
                }
            },
        } as NewsItem;
    })
}

