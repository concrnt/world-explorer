import {CONCRNT_API_HOST} from "./main"
import {Domain, DomainCache, Timeline, User} from "./type";


export const gather = async (): Promise<DomainCache[]> => {
    const hostDomain = await getConcrntDomain(CONCRNT_API_HOST)
    const hostTimelines = await getTimelines(CONCRNT_API_HOST)
    const hostUsers = await getUsers(CONCRNT_API_HOST)

    const host: DomainCache = {
        domain: hostDomain,
        timelines: hostTimelines,
        users: hostUsers
    }

    const domains = await getConcrntDomains()
    const data = domains.map(async (domain: Domain) => {
        const domainWithMeta = await getConcrntDomain(domain.fqdn)
        if (domainWithMeta.ccid === "") {
            // ドメインが生きていない
            return {domain: domainWithMeta, timelines: [], users: []}
        }
        const timelines = await getTimelines(domain.fqdn)
        const users = await getUsers(domain.fqdn)
        return {domain: domainWithMeta, timelines, users}
    })

    const d = await Promise.all(data)
    if (d.filter((d) => d.domain.fqdn === CONCRNT_API_HOST).length === 0) {
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

export const getUsers = async (fqdn: string): Promise<User[]> => {
    // 100件しか返ってこないので、100件ずつ取得して、帰ってくる件数が100件未満になったら終了
    let users: User[] = []
    // untilは取得した最初のユーザーのcdateを使う
    let until: number | undefined = undefined
    while (true) {
        try {
            const _users = await _getUsers(fqdn, until)
            if(_users.length === 0) {
                break
            }
            until = Math.ceil(new Date(_users[_users.length - 1].cdate).getTime() / 1000)
            users = users.concat(_users)
            console.log("users", users.length)
            if (_users.length !== 100) {
                // 100件未満なので終了
                break
            }
        } catch(e) {
            console.log("error", fqdn)
        }
    }

    return users
}

const _getUsers = async (fqdn: string, until?: number): Promise<User[]> => {
    const endpoint = `https://${fqdn}/api/v1/profiles?schema=https%3A%2F%2Fschema.concrnt.world%2Fp%2Fmain.json&limit=100` + (until ? `&until=${until}` : "")
    console.log("getUsers", fqdn, until, endpoint)
    const users = await fetch(endpoint)
        .then(response => response.json())
        .then(data => data.content)

    return users.map((user: User) => {
        return {
            ...user,
            _parsedDocument: JSON.parse(user.document ?? ""),
            fqdn
        }
    }).map((user: User) => delete user.document && user)
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
