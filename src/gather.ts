import { CONCRNT_API_HOST } from "./main"
import {Domain, DomainCache, Timeline} from "./type";


export const gather = async (): Promise<DomainCache[]> => {
    const hostDomain = await getConcrntDomain(CONCRNT_API_HOST)
    const hostTimelines = await getTimelines(CONCRNT_API_HOST)

    const host: DomainCache = {
        domain: hostDomain,
        timelines: hostTimelines
    }

    const domains = await getConcrntDomains()
    const data = domains.map(async (domain: Domain) => {
        const domainWithMeta = await getConcrntDomain(domain.fqdn)
        if(domainWithMeta.ccid === "") {
            // ドメインが生きていない
            return {domain: domainWithMeta, timelines: []}
        }
        const timelines = await getTimelines(domain.fqdn)
        return {domain: domainWithMeta, timelines}
    })

    const d = await Promise.all(data)
    if(d.filter((d) => d.domain.fqdn === CONCRNT_API_HOST).length === 0) {
        d.push(host)
    }
    return d
}


export const getTimelines = async (fqdn: string): Promise<Timeline[]> => {
    const timelines = await fetch(`https://${fqdn}/api/v1/timelines?schema=https%3A%2F%2Fschema.concrnt.world%2Ft%2Fcommunity.json`)
        .then(response => response.json())
        .then(data => data.content)
    return timelines.map((timeline: Timeline) => {
        return {
            ...timeline,
            _parsedDocument: JSON.parse(<string>timeline.document)
        }
    })
}

export const getConcrntDomains = async (): Promise<Domain[]> => {
    return await fetch(`https://${process.env.CONCRNT_API_HOST}/api/v1/domains`)
        .then(response => response.json())
        .then(data => data.content)
}


export const getConcrntDomain = async (fqdn: string): Promise<Domain> => {
    try {
        return await fetch(`https://${fqdn}/api/v1/domain`)
            .then(response => response.json())
            .then(data => data.content)
    } catch (e) {
        return {
            fqdn,
            ccid: "",
            csid: "",
            tag: "",
            score: 0,
            isScoreFixed: false,
            dimension: "",
            cdate: "",
            mdate: "",
            lastScraped: ""
        }
    }
}
