// dotenv
import dotenv from 'dotenv';

dotenv.config();

console.log("--- ENV ---")
console.log("CONCRNT_API_HOST", process.env.CONCRNT_API_HOST);
console.log("SERVER_PORT", process.env.SERVER_PORT);
console.log("CACHE_INTERVAL_MILLISECONDS", process.env.CACHE_INTERVAL_MILLISECONDS);


import express from 'express';
import {gather} from "./gather";
import {DomainCache} from "./type";
import MiniSearch from 'minisearch'

const app = express();

let cache: DomainCache[] = []
let aliveCache: DomainCache[] = []

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

export const task = async () => {
    cache = await gather()
    // どうにかする必要があるかもしれない
    aliveCache = cache.filter((domain) => domain.domain.ccid !== "")
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
