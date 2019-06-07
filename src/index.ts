import * as cheerio from "cheerio";
import * as request from "request";

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
        var items = $('.cp-search-result-item-content').each(function (i, elem) {
            results.push({
                title: $(this).find(".title-content").text(),
                author: $(this).find(".author-link").first().text(),
                format: $(this).find(".cp-format-indicator span").first().text(),
                callNumber: $(this).find(".cp-call-number").text().trim(),
                availability: $(this).find(".cp-availability-status").text().trim(),
                holds: $(this).find(".cp-hold-counts").text().trim(),
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
                form_data.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
                request.post({
                    url: login_url,
                    form: form_data,
                    followAllRedirects: true
                }, (err, res, b) => {
                    if (b.indexOf("Logged in as " + this.username) !== -1) {
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
            url: this.base_url + "/search",
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
    
          request(this.base_url + "/holds/select_hold/" + book.id, (error, response, body) => {
            var $ = cheerio.load(body);
            args.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
            $(".selectpicker[name='branch'] option").each((i, elem) => {
              if($(this).text() == location) {
                args.branch = $(this).attr("value");
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
          request(this.base_url + "/holds/index/active", (error, response, body) => {
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