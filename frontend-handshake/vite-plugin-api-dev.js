var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
function patchReqQuery(req, rawUrl) {
    var url = new URL(rawUrl, "http://localhost");
    var q = {};
    url.searchParams.forEach(function (v, k) {
        q[k] = v;
    });
    req.query = q;
}
function patchResJson(res) {
    var r = res;
    r.status = function (code) {
        res.statusCode = code;
        return {
            json: function (body) {
                if (!res.headersSent) {
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                }
                res.end(JSON.stringify(body));
            },
        };
    };
}
export function apiDevPlugin() {
    return {
        name: "api-dev-handlers",
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var rawUrl, pathname, handlers, load, nodeReq, nodeRes, mod, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            rawUrl = req.url || "";
                            if (!rawUrl.startsWith("/api/")) {
                                next();
                                return [2 /*return*/];
                            }
                            pathname = new URL(rawUrl, "http://localhost").pathname;
                            handlers = {
                                "/api/vouches": function () { return import("./api/vouches.js"); },
                                "/api/vouch-leaderboard": function () { return import("./api/vouch-leaderboard.js"); },
                                "/api/handshake-activity": function () { return import("./api/handshake-activity.js"); },
                                "/api/profile-search": function () { return import("./api/profile-search.js"); },
                                "/api/indexer-profiles": function () { return import("./api/indexer-profiles.js"); },
                            };
                            load = handlers[pathname];
                            if (!load) {
                                next();
                                return [2 /*return*/];
                            }
                            nodeReq = req;
                            nodeRes = res;
                            patchReqQuery(nodeReq, rawUrl);
                            patchResJson(nodeRes);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, load()];
                        case 2:
                            mod = _a.sent();
                            return [4 /*yield*/, mod.default(nodeReq, nodeRes)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            if (!nodeRes.headersSent) {
                                nodeRes.statusCode = 500;
                                nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
                                nodeRes.end(JSON.stringify({ error: String(e_1) }));
                            }
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
        },
    };
}
