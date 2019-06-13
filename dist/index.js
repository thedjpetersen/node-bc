"use strict";
exports.__esModule = true;
var cheerio = require("cheerio");
var request = require("request").defaults({ jar: true });
var Bibliocommons = /** @class */ (function () {
    function Bibliocommons(props) {
        var _this = this;
        this.rq = request.defaults({ jar: true });
        this.findBooks = function (results, body) {
            var $ = cheerio.load(body);
            var items = $('.cp-search-result-item-content,.cp-bib-list-item').each(function (i, elem) {
                var title = $(this).find(".title-content").text();
                var author = $(this).find(".author-link").first().text();
                $(this).find(".cp-manifestation-list-item").each(function (subIndex, subElem) {
                    results.push({
                        title: title,
                        author: author,
                        id: $(this).find(".manifestation-item-format-info-wrap a").attr("href").split("/").pop(),
                        format: $(this).find(".cp-format-indicator span").first().text(),
                        callNumber: $(this).find(".cp-call-number").text().trim(),
                        availability: $(this).find(".cp-availability-status").text().trim(),
                        holds: $(this).find(".cp-hold-counts").text().trim()
                    });
                });
            });
            return results;
        };
        this.login = function () {
            var form_data = {
                "utf-8": "✓",
                "local": false,
                "commit": "Log in",
                "name": _this.username,
                "user_pin": _this.pin
            };
            return new Promise(function (resolve, reject) {
                var login_url = _this.base_url_secure + "/user/login";
                request(login_url, function (error, response, body) {
                    var $ = cheerio.load(body);
                    var auth_token = $("input[name='authenticity_token']").first().attr("value");
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
                    }, function (err, res, b) {
                        // if (b.indexOf("Logged in as " + this.username) !== -1) {
                        if (res.statusCode === 200) {
                            resolve({ err: err, res: res, b: b });
                        }
                        else {
                            reject({ err: err, res: res, b: b });
                        }
                    });
                });
            });
        };
        this.search = function (query, category) {
            var args = {
                "utf-8": "✓",
                "commit": "Search",
                "t": "smart",
                "q": query,
                "search_category": category || "keyword"
            };
            var results = [];
            return new Promise(function (resolve, reject) {
                if (typeof query === "undefined") {
                    reject("Must past a query");
                }
                request({
                    url: _this.base_url_secure + "/search",
                    qs: args
                }, function (error, response, body) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(_this.findBooks(results, body));
                    }
                });
            });
        };
        this.place_hold = function (book, location) {
            return new Promise(function (resolve, reject) {
                var args = {
                    "utf-8": "✓"
                };
                request(_this.base_url_secure + "/holds/select_hold/" + book.id, function (error, response, body) {
                    var $ = cheerio.load(body);
                    args.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
                    $(".selectpicker[name='branch'] option").each(function (i, elem) {
                        if ($(elem).text() == location) {
                            args.branch = $(elem).attr("value");
                        }
                    });
                    request.post({
                        url: _this.base_url_secure + "/holds/request_hold/" + book.id + ".json",
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRF-Token": args.authenticity_token
                        },
                        form: args
                    }, function (err, res, b) {
                        b = JSON.parse(b);
                        console.log(b);
                        if (b.success) {
                            resolve(b.messages[0].key);
                        }
                        else {
                            reject(b.messages[0].key);
                        }
                    });
                });
            });
        };
        this.holds = function () {
            return new Promise(function (resolve, reject) {
                request(_this.base_url_secure + "/v2/holds", function (error, response, body) {
                    var results = [];
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(_this.findBooks(results, body));
                    }
                });
            });
        };
        this.city = props.city;
        this.username = props.username;
        this.pin = props.pin;
        this.base_url = "http://" + this.city + ".bibliocommons.com";
        this.base_url_secure = "https://" + this.city + ".bibliocommons.com";
    }
    return Bibliocommons;
}());
exports.Bibliocommons = Bibliocommons;
