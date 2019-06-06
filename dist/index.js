"use strict";
exports.__esModule = true;
var cheerio = require("cheerio");
var request = require("request");
var Bibliocommons = /** @class */ (function () {
    function Bibliocommons(props) {
        var _this = this;
        this.rq = request.defaults({ jar: true });
        this.findBooks = function (results, body) {
            var $ = cheerio.load(body);
            var items = $('.cp-search-result-item-content').each(function (i, elem) {
                results.push({
                    title: $(this).find(".title-content").text(),
                    author: $(this).find(".author-link").text(),
                    format: $(this).find(".cp-format-indicator span").text(),
                    callNumber: $(this).find(".cp-call-number").text().trim(),
                    availability: $(this).find(".cp-availability-status").text().trim(),
                    holds: $(this).find(".cp-hold-counts").text().trim()
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
                    form_data.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
                    request.post({
                        url: login_url,
                        form: form_data,
                        followAllRedirects: true
                    }, function (err, res, b) {
                        if (b.indexOf("Logged in as " + _this.username) !== -1) {
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
                    url: _this.base_url + "/search",
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
                request(_this.base_url + "/holds/select_hold/" + book.id, function (error, response, body) {
                    var $ = cheerio.load(body);
                    args.authenticity_token = $("input[name='authenticity_token']").first().attr("value");
                    $(".selectpicker[name='branch'] option").each(function (i, elem) {
                        if ($(_this).text() == location) {
                            args.branch = $(_this).attr("value");
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
                request(_this.base_url + "/holds/index/active", function (error, response, body) {
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
