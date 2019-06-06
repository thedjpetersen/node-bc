interface ClassProps {
    city: string;
    username: string;
    pin: string;
}
export declare class Bibliocommons {
    private rq;
    private base_url;
    private base_url_secure;
    private city;
    private username;
    private pin;
    constructor(props: ClassProps);
    findBooks: (results: any, body: any) => any;
    login: () => Promise<unknown>;
    search: (query: any, category?: string) => Promise<unknown>;
    place_hold: (book: any, location: any) => Promise<unknown>;
    holds: () => Promise<unknown>;
}
export {};
