// @ts-nocheck — dynamic imports of Vercel API routes (.js) have no typings
/**
 * Dev-only: run selected `api/*.js` serverless handlers in Node so `/api/*` returns JSON.
 * Add routes to `handlers` when you need local testing (e.g. /api/vouches).
 */
import type { IncomingMessage, ServerResponse } from "http";
import type { Plugin } from "vite";

function patchReqQuery(req: IncomingMessage, rawUrl: string) {
  const url = new URL(rawUrl, "http://localhost");
  const q: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    q[k] = v;
  });
  (req as IncomingMessage & { query: Record<string, string> }).query = q;
}

function patchResJson(res: ServerResponse) {
  const r = res as ServerResponse & {
    status?: (code: number) => { json: (b: unknown) => void };
  };
  r.status = function (code: number) {
    res.statusCode = code;
    return {
      json: (body: unknown) => {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.end(JSON.stringify(body));
      },
    };
  };
}

export function apiDevPlugin(): Plugin {
  return {
    name: "api-dev-handlers",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || "";
        if (!rawUrl.startsWith("/api/")) {
          next();
          return;
        }
        const pathname = new URL(rawUrl, "http://localhost").pathname;
        type HandlerMod = { default: (req: unknown, res: unknown) => unknown };
        const handlers: Record<string, () => Promise<HandlerMod>> = {
          "/api/vouches": () => import("./api/vouches.js"),
          "/api/vouch-leaderboard": () => import("./api/vouch-leaderboard.js"),
        };
        const load = handlers[pathname];
        if (!load) {
          next();
          return;
        }

        const nodeReq = req as IncomingMessage;
        const nodeRes = res as ServerResponse;
        patchReqQuery(nodeReq, rawUrl);
        patchResJson(nodeRes);

        try {
          const mod = await load();
          await mod.default(nodeReq, nodeRes);
        } catch (e) {
          if (!nodeRes.headersSent) {
            nodeRes.statusCode = 500;
            nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
            nodeRes.end(JSON.stringify({ error: String(e) }));
          }
        }
      });
    },
  };
}
