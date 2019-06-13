import * as cheerio from "cheerio";
const request = require("request").defaults({jar: true});

interface ClassProps {
    city: string;
    username: string;
    pin: string;
}

export class Bibliocommons {
    private rq = request.defaults({ jar: true });
    private base_url: string;
    private base_url_secure: string;

    private city: string;
    private username: string;
    private pin: string;


    constructor(props: ClassProps) {
        this.city = props.city;
        this.username = props.username;
        this.pin = props.pin;

        this.base_url = `http://${this.city}.bibliocommons.com`;
        this.base_url_secure = `https://${this.city}.bibliocommons.com`;
    }

    public findBooks = (results, body) => {
        var $ = cheerio.load(body);
        var items = $('.cp-search-result-item-content,.cp-bib-list-item').each(function (i, elem) {
          const title = $(this).find(".title-content").text();
          const author = $(this).find(".author-link").first().text();
          $(this).find(".cp-manifestation-list-item").each(function(subIndex, subElem) {
            results.push({
                title,
                author,
                id: $(this).find(".manifestation-item-format-info-wrap a").attr("href").split("/").pop(),
                format: $(this).find(".cp-format-indicator span").first().text(),
                callNumber: $(this).find(".cp-call-number").text().trim(),
                availability: $(this).find(".cp-availability-status").text().trim(),
                holds: $(this).find(".cp-hold-counts").text().trim(),
            });
          });
        });
        return results;
    }

    public login = () => {
        var form_data: any = {
            "utf-8": "✓",
            "local": false,
            "commit": "Log in",
            "name": this.username,
            "user_pin": this.pin
        };

        return new Promise((resolve, reject) => {
            var login_url = this.base_url_secure + "/user/login";
            request(login_url, (error, response, body) => {
                var $ = cheerio.load(body);
                const auth_token = $("input[name='authenticity_token']").first().attr("value");
                form_data.authenticity_token = auth_token;
                request.post({
                    url: login_url + "?destination=%2Fdashboard%2Fuser_dashboard",
                    form: form_data,
                    followAllRedirects: true,
                    headers: {
                        "Accept": "application/json, text/javascript, */*; q=0.01",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
                        "X-CSRF-Token": auth_token,
                        "X-Requested-With": "XMLHttpRequest",
                        "X-RESPONSIVE-PAGE": true
                    }
                }, (err, res, b) => {
                    // if (b.indexOf("Logged in as " + this.username) !== -1) {
                    if (res.statusCode === 200) {
                        resolve({ err, res, b });
                    } else {
                        reject({ err, res, b });
                    }
                });
            });
        });
    }

    public search = (query, category?: string) => {
        var args = {
          "utf-8": "✓",
          "commit": "Search",
          "t": "smart",
          "q": query,
          "search_category": category || "keyword"
        };
    
        var results = []
    
        return new Promise((resolve, reject) => {
          if(typeof query === "undefined") {
            reject("Must past a query");
          }
          request({
            url: this.base_url_secure + "/search",
            qs: args
          }, (error, response, body) => {
            if(error) {
              reject(error);
            } else {
              resolve(this.findBooks(results, body));
            }
          })
        });
      };
    
      public place_hold = (book, location) => {
        return new Promise((resolve,reject) => {
          var args: any = {
            "utf-8": "✓",
          };
    
          request(this.base_url_secure + "/holds/select_hold/" + book.id, (error, response, body) => {
            var $ = cheerio.load(body);
            args.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
            $(".selectpicker[name='branch'] option").each((i, elem) => {
              if($(elem).text() == location) {
                args.branch = $(elem).attr("value");
              }
            });
            request.post({
              url: this.base_url_secure + "/holds/request_hold/" + book.id + ".json", 
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-Token": args.authenticity_token
              },
              form: args
            }, (err, res, b) => {
              b = JSON.parse(b);
              console.log(b);
              if(b.success) {
                resolve(b.messages[0].key);
              } else {
                reject(b.messages[0].key);
              }
            });
          });
        });
      };
    
      public holds = () => {
        return new Promise((resolve, reject) => {
          request(this.base_url_secure + "/v2/holds", (error, response, body) => {
            var results = [];
            if (error) {
              reject(error);
            } else {
              resolve(this.findBooks(results, body));
            }
          });
        });
      };
}