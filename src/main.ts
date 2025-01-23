// dotenv
import dotenv from 'dotenv';

dotenv.config();

console.log("--- ENV ---")
console.log("CONCRNT_API_HOST", process.env.CONCRNT_API_HOST);
console.log("SERVER_PORT", process.env.SERVER_PORT);
console.log("CACHE_INTERVAL_MILLISECONDS", process.env.CACHE_INTERVAL_MILLISECONDS);

if (!process.env.CONCRNT_API_HOST) {
    console.error("CONCRNT_API_HOST is not defined.")
    process.exit(1)
}
export const CONCRNT_API_HOST = process.env.CONCRNT_API_HOST

if (!process.env.SERVER_PORT) {
    console.error("SERVER_PORT is not defined. using default port 3000.")
    process.env.SERVER_PORT = "3000"
}

export const SERVER_PORT = process.env.SERVER_PORT

if (!process.env.CACHE_INTERVAL_MILLISECONDS) {
    console.error("CACHE_INTERVAL_MILLISECONDS is not defined. using default interval 300000.")
    process.env.CACHE_INTERVAL_MILLISECONDS = "300000"
}

export const CACHE_INTERVAL_MILLISECONDS = process.env.CACHE_INTERVAL_MILLISECONDS

import express from 'express';
import cors from 'cors';
import MiniSearch from 'minisearch'

import {gather} from "./gather";
import {DomainCache, Timeline} from "./type";

const app = express();
app.use(cors());

let cache: DomainCache[] = []
let aliveCache: DomainCache[] = []
let timelineCache: Timeline[] = []

let miniSearch = new MiniSearch({
    fields: ["name", "shortname", "description"],
    storeFields: ["name", "shortname", "description", "domain", "id"],
    processTerm: (term, _fieldName) => {
        return term.toLowerCase()
    }
})

app.get('/', (req, res) => {
    res.send('concurrent community cache');
});

app.get('/cache', (req, res) => {
    const {showOffline, q} = req.query
    if (showOffline === "true") {
        res.json(cache)
    } else {
        if (q) {
            res.json(fuzzySearch(`${q}`))
            return
        }
        res.json(aliveCache)
    }
});

app.get("/domain", (req, res) => {
    res.json(aliveCache.map((d) => d.domain))
})

app.get("/timeline", (req, res) => {
    const {q, random, limit} = req.query
    let _result = timelineCache
    if (q) {
        _result = fuzzySearchTimeline(`${q}`)
    }

    if (random) {
        _result = _result.sort(() => Math.random() - 0.5)
    }

    if (limit) {
        _result = _result.slice(0, Number(limit))
    }

    res.json(_result)
})

app.get("/stat", (req, res) => {
    res.json({
        domains: aliveCache.length,
        timelines: timelineCache.length
    })
})

app.listen(process.env.SERVER_PORT, () => {
    console.log('server started on PORT ', process.env.SERVER_PORT)
});

export const fuzzySearch = (q: string) => {
    const result = miniSearch.search(`${q}`, {prefix: true})
    // DomainCache[] に変換
    return aliveCache.map((domain) => {
        const _tls = domain.timelines.filter((timeline) => {
            return result.some((r) => r.id === timeline.id)
        })
        return {
            domain: domain.domain,
            timelines: _tls
        }
    }).filter((domain) => domain.timelines.length > 0)
}

export const fuzzySearchTimeline = (q: string) => {
    const result = miniSearch.search(`${q}`, {prefix: true})
    return timelineCache.filter((timeline) => {
        return result.some((r) => r.id === timeline.id)
    })
}

export const task = async () => {
    cache = await gather()
    // どうにかする必要があるかもしれない
    aliveCache = cache.filter((domain) => domain.domain.ccid !== "")
    timelineCache = aliveCache.map(d => d.timelines.map((t) => { t.domainFQDN = d.domain.fqdn; delete t.document; return t })).flat()

    miniSearch.removeAll()

    const flatCache = aliveCache.map((domain) => {
        return domain.timelines.map((timeline) => {
            return {
                id: timeline.id,
                name: timeline._parsedDocument.body.name,
                shortname: timeline._parsedDocument.body.shortname,
                description: timeline._parsedDocument.body.description,
                domain: domain.domain.fqdn
            }
        })
    }).flat()
    miniSearch.addAll(flatCache)
    console.log("cache updated.")
}

// first run
task()

// update cache interval
let lock = false
setInterval(async () => {
    if (lock) {
        console.log("update in progress. this task is skipped.")
        return
    }
    console.log("update task started.")
    lock = true
    await task()
    lock = false
    console.log("update task finished.")
}, Number(process.env.CACHE_INTERVAL_MILLISECONDS))
