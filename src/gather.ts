import dotenv from "dotenv";
import {Domain, DomainCache, Timeline} from "./type";

dotenv.config();

export const gather = async (): Promise<DomainCache[]> => {
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

    return Promise.all(data)
}


export const getTimelines = async (fqdn: string): Promise<Timeline[]> => {
    const timelines = await fetch(`https://${fqdn}/api/v1/timelines?schema=https%3A%2F%2Fschema.concrnt.world%2Ft%2Fcommunity.json`)
        .then(response => response.json())
        .then(data => data.content)
    return timelines.map((timeline: Timeline) => {
        return {
            ...timeline,
            _parsedDocument: JSON.parse(timeline.document)
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
