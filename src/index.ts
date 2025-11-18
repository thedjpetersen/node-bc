import * as cheerio from "cheerio";
import axios, { AxiosInstance } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

interface ClassProps {
    city: string;
    username: string;
    pin: string;
}

export interface Book {
    title: string;
    author: string;
    id: string;
    format: string;
    callNumber: string;
    availability: string;
    holds: string;
}

interface LoginResponse {
    success: boolean;
}

interface HoldResponse {
    success: boolean;
    messages: Array<{ key: string }>;
}

export class Bibliocommons {
    private client: AxiosInstance;
    private baseUrl: string;
    private baseUrlSecure: string;
    private city: string;
    private username: string;
    private pin: string;

    constructor(props: ClassProps) {
        this.city = props.city;
        this.username = props.username;
        this.pin = props.pin;

        this.baseUrl = `http://${this.city}.bibliocommons.com`;
        this.baseUrlSecure = `https://${this.city}.bibliocommons.com`;

        // Create axios instance with cookie jar support
        const jar = new CookieJar();
        this.client = wrapper(axios.create({
            jar,
            withCredentials: true,
            headers: {
                "User-Agent": "node-bc/2.0.0",
            },
        }));
    }

    private findBooks(results: Book[], body: string): Book[] {
        const $ = cheerio.load(body);
        $(".cp-search-result-item-content,.cp-bib-list-item").each((i, elem) => {
            const title = $(elem).find(".title-content").text();
            const author = $(elem).find(".author-link").first().text();
            $(elem).find(".cp-manifestation-list-item").each((subIndex, subElem) => {
                const href = $(subElem).find(".manifestation-item-format-info-wrap a").attr("href");
                if (href) {
                    results.push({
                        title,
                        author,
                        id: href.split("/").pop() || "",
                        format: $(subElem).find(".cp-format-indicator span").first().text(),
                        callNumber: $(subElem).find(".cp-call-number").text().trim(),
                        availability: $(subElem).find(".cp-availability-status").text().trim(),
                        holds: $(subElem).find(".cp-hold-counts").text().trim(),
                    });
                }
            });
        });
        return results;
    }

    public async login(): Promise<LoginResponse> {
        const loginUrl = `${this.baseUrlSecure}/user/login`;

        // Get the login page to extract authenticity token
        const initialResponse = await this.client.get(loginUrl);
        const $ = cheerio.load(initialResponse.data);
        const authToken = $("input[name='authenticity_token']").first().attr("value");

        if (!authToken) {
            throw new Error("Could not find authenticity token");
        }

        // Prepare form data
        const formData = new URLSearchParams({
            "utf-8": "✓",
            "local": "false",
            "commit": "Log in",
            "name": this.username,
            "user_pin": this.pin,
            "authenticity_token": authToken,
        });

        // Perform login
        const response = await this.client.post(
            `${loginUrl}?destination=%2Fdashboard%2Fuser_dashboard`,
            formData.toString(),
            {
                headers: {
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRF-Token": authToken,
                    "X-Requested-With": "XMLHttpRequest",
                    "X-RESPONSIVE-PAGE": "true",
                },
                maxRedirects: 5,
            }
        );

        if (response.status === 200) {
            return { success: true };
        } else {
            throw new Error(`Login failed with status ${response.status}`);
        }
    }

    public async search(query: string, category: string = "keyword"): Promise<Book[]> {
        if (!query) {
            throw new Error("Must provide a query");
        }

        const params = {
            "utf-8": "✓",
            "commit": "Search",
            "t": "smart",
            "q": query,
            "search_category": category,
        };

        const response = await this.client.get(`${this.baseUrlSecure}/search`, {
            params,
        });

        const results: Book[] = [];
        return this.findBooks(results, response.data);
    }

    public async placeHold(book: Book, location: string): Promise<string> {
        // Get the hold selection page
        const selectHoldUrl = `${this.baseUrlSecure}/holds/select_hold/${book.id}`;
        const response = await this.client.get(selectHoldUrl);

        const $ = cheerio.load(response.data);
        const authToken = $("input[name='authenticity_token']").first().attr("value");

        if (!authToken) {
            throw new Error("Could not find authenticity token");
        }

        // Find the branch ID for the specified location
        let branchId: string | undefined;
        $(".selectpicker[name='branch'] option").each((i, elem) => {
            if ($(elem).text() === location) {
                branchId = $(elem).attr("value");
            }
        });

        if (!branchId) {
            throw new Error(`Could not find branch ID for location: ${location}`);
        }

        // Prepare form data
        const formData = new URLSearchParams({
            "utf-8": "✓",
            "authenticity_token": authToken,
            "branch": branchId,
        });

        // Place the hold
        const holdResponse = await this.client.post<HoldResponse>(
            `${this.baseUrlSecure}/holds/request_hold/${book.id}.json`,
            formData.toString(),
            {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": authToken,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const data = holdResponse.data;
        if (data.success) {
            return data.messages[0].key;
        } else {
            throw new Error(data.messages[0].key);
        }
    }

    public async holds(): Promise<Book[]> {
        const response = await this.client.get(`${this.baseUrlSecure}/v2/holds`);
        const results: Book[] = [];
        return this.findBooks(results, response.data);
    }
}
