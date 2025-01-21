export type Domain =
    {
        fqdn: string;
        ccid: string;
        csid: string;
        tag: string;
        score: number;
        meta?: DomainMeta;
        isScoreFixed: boolean;
        dimension: string;
        cdate: string;
        mdate: string;
        lastScraped: string;
    }

export type DomainMeta = {
    nickname: string;
    description: string;
    logo: string;
    wordmark: string;
    themeColor: string;
    maintainerName: string;
    maintainerEmail: string;
    registration: string;
    version: string;
    buildInfo: {
        BuildTime: string;
        BuildMachine: string;
        GoVersion: string;
    };
    captchaSiteKey: string;
    vapidKey: string;
}

// document

export type Timeline = {
    id: string;
    indexable: boolean;
    owner: string;
    author: string;
    schema: string;
    policy: string;
    policyParams: string;
    document: string;
    _parsedDocument: {
        id: string;
        owner: string;
        signer: string;
        type: string;
        schema: string;
        body: {
            name: string;
            shortname: string;
            description: string;
        },
        meta: {
            client: string;
        },
        signAt: string;
        indexable: boolean;
        policy: string;
        keyID: string;
    }
    signature: string;
    cdate: string;
    mdate: string;
}


export type DomainCache = {
    domain: Domain;
    timelines: Timeline[];
}
