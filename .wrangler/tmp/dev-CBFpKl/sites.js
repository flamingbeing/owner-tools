var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/routes.js
var SITES = {
  // Ask Claude, the owner's page (behind Cloudflare Access; its API is worker/ask.js)
  "ask.anawj.com": { root: "ask/" }
};
var SHARED = [];
var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;
function resolve(host, pathname) {
  const out = route(host, pathname);
  return out.file != null && /%2e|%2f|%5c|\\|(^|\/)\.\.?(\/|$)/i.test(out.file) ? { notFound: true } : out;
}
__name(resolve, "resolve");
function route(host, pathname) {
  host = String(host || "").toLowerCase().replace(/:\d+$/, "");
  const site = SITES[host], p = pathname;
  if (!site) return LOCAL.test(host) ? { file: p.replace(/^\//, "") } : { notFound: true };
  for (const dir of SHARED) {
    if (p === dir.slice(0, -1)) return { redirect: dir };
    if (p.startsWith(dir)) return { file: p.slice(1) };
  }
  if (site.moved) {
    for (const [prefix, to] of Object.entries(site.moved)) {
      if (p === prefix.slice(0, -1) || p.startsWith(prefix)) return { redirect: to + p.slice(prefix.length) };
    }
    return { notFound: true };
  }
  for (const [prefix, folder] of Object.entries(site.root ? site.prefixes || {} : {})) {
    if (p.startsWith(prefix)) return { file: folder + p.slice(prefix.length) };
  }
  if (site.root) {
    const own = "/" + site.root;
    if (p === own.slice(0, -1)) return { redirect: own };
    if (p.startsWith(own)) return { file: site.root + p.slice(own.length) };
    return { file: site.root + p.replace(/^\//, "") };
  }
  for (const [prefix, folder] of Object.entries(site.prefixes || {})) {
    if (p === prefix.slice(0, -1)) return { redirect: prefix };
    if (p.startsWith(prefix)) return { file: folder + p.slice(prefix.length) };
  }
  return { notFound: true };
}
__name(route, "route");

// worker/ask.js
var ASK_HOST = "ask.anawj.com";
var REPOS = {
  "hand.anawj.com": { repo: "flamingbeing/hand" }
};
var DEFAULT_REPO = { repo: "flamingbeing/anawj-site", preview: "anawj-preview.kohwenjun.workers.dev" };
var repoOf = /* @__PURE__ */ __name((host) => REPOS[String(host || "").toLowerCase()] || DEFAULT_REPO, "repoOf");
var LIMIT = { page: 500, on: 2e3, locator: 500, text: 4e3 };
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }), "json");
async function handleAsk(request, env, fetchImpl = fetch) {
  const missing = ["GITHUB_ISSUES_TOKEN", "ACCESS_TEAM", "ACCESS_AUD"].filter((k) => !env[k]);
  if (missing.length) return json({ error: `Ask Claude is not set up yet: the Worker has no ${missing.join(", ")} (Cloudflare \u2192 this Worker \u2192 Settings \u2192 Variables and Secrets; type Secret, then Deploy).` }, 503);
  const who = await verifyAccess(request.headers.get("Cf-Access-Jwt-Assertion"), env, fetchImpl);
  if (!who) return json({ error: "Sign in first (this page is only for the owner)." }, 401);
  const url = new URL(request.url);
  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== `https://${ASK_HOST}`) return json({ error: "Wrong origin." }, 403);
    let b;
    try {
      b = await request.json();
    } catch (e) {
      return json({ error: "Not JSON." }, 400);
    }
    const field = /* @__PURE__ */ __name((k) => typeof b[k] === "string" ? b[k].trim() : "", "field");
    const page = field("page"), text = field("text");
    if (!text) return json({ error: "Say what should change." }, 400);
    for (const [k, n] of Object.entries(LIMIT)) if (field(k).length > n) return json({ error: `${k} is too long.` }, 400);
    let pageUrl;
    try {
      pageUrl = new URL(page);
    } catch (e) {
      return json({ error: "Which page? (a full address)" }, 400);
    }
    if (!/(^|\.)anawj\.com$|\.workers\.dev$/.test(pageUrl.hostname)) return json({ error: "Only pages on anawj.com." }, 400);
    const { repo: REPO } = repoOf(pageUrl.hostname);
    const res = await gh(fetchImpl, env, `/repos/${REPO}/issues`, { method: "POST", body: JSON.stringify({ title: issueTitle(pageUrl), body: issueBody(b, pageUrl) }) });
    if (!res.ok) return json({ error: `GitHub said ${res.status}.` }, 502);
    const issue = await res.json();
    return json({ issue: issue.number, url: issue.html_url });
  }
  if (request.method === "GET") {
    const n = Number(url.searchParams.get("issue"));
    let pageHost = "";
    try {
      pageHost = new URL(url.searchParams.get("page")).hostname;
    } catch (e) {
    }
    const { repo: REPO, preview } = repoOf(pageHost);
    if (!Number.isInteger(n) || n <= 0) return json({ error: "Which issue?" }, 400);
    const res = await gh(fetchImpl, env, `/repos/${REPO}/issues/${n}/comments?per_page=50`);
    if (!res.ok) return json({ error: `GitHub said ${res.status}.` }, 502);
    const linked = (await res.json()).map((c) => c.body || "").join("\n").match(new RegExp(`https://github\\.com/${REPO}/pull/(\\d+)`));
    if (!linked) return json({ issue: n, pr: null });
    const pr = Number(linked[1]);
    const pres = await gh(fetchImpl, env, `/repos/${REPO}/pulls/${pr}`);
    const head = pres.ok ? (await pres.json()).head?.ref : "";
    return json({ issue: n, pr, prUrl: `https://github.com/${REPO}/pull/${pr}`, preview: head && preview ? previewOf(head, url.searchParams.get("page"), preview) : null });
  }
  return json({ error: "Method not allowed." }, 405);
}
__name(handleAsk, "handleAsk");
var gh = /* @__PURE__ */ __name((fetchImpl, env, path, init = {}) => fetchImpl("https://api.github.com" + path, {
  ...init,
  headers: { Authorization: `Bearer ${env.GITHUB_ISSUES_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "anawj-ask", ...init.body ? { "Content-Type": "application/json" } : {} }
}), "gh");
function previewOf(branch, page, worker = DEFAULT_REPO.preview) {
  const base = `https://${branch.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${worker}`;
  try {
    const u = new URL(page);
    const path = u.pathname + u.search;
    return u.hostname === "anawj.com" || u.hostname === "www.anawj.com" || u.hostname.endsWith(".workers.dev") ? base + path : `${base}/_sites/${u.hostname}${path}`;
  } catch (e) {
    return base + "/";
  }
}
__name(previewOf, "previewOf");
function issueTitle(u) {
  return `Page edits: ${u.host}${u.pathname} (owner, Ask Claude)`.slice(0, 200);
}
__name(issueTitle, "issueTitle");
function issueBody(b, u) {
  const q = /* @__PURE__ */ __name((s) => String(s).split("\n").map((l) => "> " + l).join("\n"), "q");
  let out = `Suggested by: the owner
Sent with Ask Claude (ask.anawj.com), 1 change.

## Page: ${u.href}

### 1. Comment${b.kind ? ` (${String(b.kind).slice(0, 40)})` : ""}
`;
  if (b.on) out += `On:
${q(String(b.on).trim())}
`;
  out += `Comment:
${q(String(b.text).trim())}
`;
  if (b.options) out += "Wants options: make 2\u20133 clearly different versions to choose from, each with its own preview link.\n";
  if (b.everywhere) out += "Everywhere: apply this wherever it occurs on the site, and list every place changed.\n";
  if (b.locator) out += `Locator: \`${String(b.locator).trim().replace(/`/g, "")}\`
`;
  return out;
}
__name(issueBody, "issueBody");
var certs = null;
var certsAt = 0;
var b64u = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0)), "b64u");
async function verifyAccess(token, env, fetchImpl = fetch, now = Date.now()) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let head, claims;
  try {
    head = JSON.parse(new TextDecoder().decode(b64u(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(b64u(parts[1])));
  } catch (e) {
    return null;
  }
  if (head.alg !== "RS256") return null;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.ACCESS_AUD) || !(claims.exp * 1e3 > now)) return null;
  if (claims.iss && claims.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return null;
  if (!certs || now - certsAt > 36e5) {
    const r = await fetchImpl(`https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!r.ok) return null;
    certs = (await r.json()).keys || [];
    certsAt = now;
  }
  const jwk = certs.find((k) => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  return ok ? claims.email || "signed in" : null;
}
__name(verifyAccess, "verifyAccess");

// worker/sites.js
var NOINDEX = "noindex, nofollow";
var sites_default = {
  async fetch(request, env) {
    const u0 = new URL(request.url);
    if (u0.hostname === ASK_HOST && u0.pathname === "/api/ask") return handleAsk(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    const url = new URL(request.url);
    const r = resolve(url.hostname, url.pathname);
    if (r.redirect) return redirect(url, r.redirect);
    if (r.notFound) return notFound();
    let file = r.file;
    if (file === "" || file.endsWith("/")) file += "index.html";
    let res = await asset(env, url, file);
    if (res.status === 404 && !/\.[^/]+$/.test(file)) {
      const dir = await asset(env, url, file + "/index.html");
      if (dir.status === 200) return redirect(url, url.pathname + "/");
    }
    if (res.status === 404) return notFound();
    res = new Response(res.body, res);
    res.headers.set("X-Robots-Tag", NOINDEX);
    return res;
  }
};
var asset = /* @__PURE__ */ __name((env, url, file) => env.ASSETS.fetch(new Request(new URL("/" + file, url), { method: "GET" })), "asset");
var redirect = /* @__PURE__ */ __name((url, path) => Response.redirect(new URL(path + url.search, url).toString(), 301), "redirect");
var notFound = /* @__PURE__ */ __name(() => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": NOINDEX } }), "notFound");

// ../../../root/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../root/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ipjOEL/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = sites_default;

// ../../../root/.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ipjOEL/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=sites.js.map
