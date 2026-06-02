#!/usr/bin/env node

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const DEFAULT_TARGET = "https://u2up4r3y5d.execute-api.us-east-1.amazonaws.com";
const targetBase = new URL(process.env.BURNX_API_PROXY_TARGET ?? DEFAULT_TARGET);
const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const allowedOrigin = process.env.BURNX_API_PROXY_ORIGIN ?? "*";

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization,Content-Type,Accept,X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

function copyRequestHeaders(headers) {
  const forwarded = {};

  for (const [name, value] of Object.entries(headers)) {
    if (!hopByHopHeaders.has(name.toLowerCase()) && value !== undefined) {
      forwarded[name] = value;
    }
  }

  forwarded.host = targetBase.host;
  return forwarded;
}

function copyResponseHeaders(headers) {
  const forwarded = {};

  for (const [name, value] of Object.entries(headers)) {
    if (!hopByHopHeaders.has(name.toLowerCase()) && value !== undefined) {
      forwarded[name] = value;
    }
  }

  return forwarded;
}

function buildTargetUrl(requestUrl) {
  const basePath = targetBase.pathname.replace(/\/$/, "");
  const incomingPath = requestUrl?.startsWith("/") ? requestUrl : `/${requestUrl ?? ""}`;
  return new URL(`${basePath}${incomingPath}`, targetBase.origin);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const targetUrl = buildTargetUrl(req.url);
  const client = targetUrl.protocol === "https:" ? https : http;
  const upstreamReq = client.request(
    targetUrl,
    {
      method: req.method,
      headers: copyRequestHeaders(req.headers),
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      path: `${targetUrl.pathname}${targetUrl.search}`,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, {
        ...copyResponseHeaders(upstreamRes.headers),
        ...corsHeaders(),
      });
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on("error", (error) => {
    console.error(`[proxy] ${req.method} ${targetUrl.href} failed:`, error.message);
    if (!res.headersSent) {
      res.writeHead(502, {
        "Content-Type": "application/json",
        ...corsHeaders(),
      });
    }
    res.end(JSON.stringify({ error: "Bad Gateway", detail: error.message }));
  });

  req.pipe(upstreamReq);
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `BurnX API proxy listening on http://127.0.0.1:${port} -> ${targetBase.origin}`,
  );
  console.log(
    "Use EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:" +
      port +
      " when starting Expo web.",
  );
});
