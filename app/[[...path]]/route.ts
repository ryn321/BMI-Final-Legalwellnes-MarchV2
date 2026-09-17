import {
  isTemporarilyUnpublishedArticlePath,
  transformApprovedOriginContent,
} from "../../lib/proxy-content";

const APPROVED_ORIGIN = "https://legal-wellness-master-final.netlify.app";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const hopByHopHeaders = [
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  const incomingUrl = new URL(request.url);
  const method = request.method.toUpperCase();
  if ((method === "GET" || method === "HEAD")
      && isTemporarilyUnpublishedArticlePath(incomingUrl.pathname)) {
    return Response.redirect(new URL("/news", incomingUrl), 307);
  }
  const upstreamUrl = new URL(`/${path.map(encodeURIComponent).join("/")}`, APPROVED_ORIGIN);
  upstreamUrl.search = incomingUrl.search;

  const requestHeaders = new Headers(request.headers);
  for (const header of hopByHopHeaders) requestHeaders.delete(header);
  for (const header of [
    "authorization",
    "cf-connecting-ip",
    "cookie",
    "true-client-ip",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) requestHeaders.delete(header);

  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: requestHeaders,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of hopByHopHeaders) responseHeaders.delete(header);

  const location = responseHeaders.get("location");
  if (location?.startsWith(APPROVED_ORIGIN)) {
    responseHeaders.set("location", `${incomingUrl.origin}${location.slice(APPROVED_ORIGIN.length)}`);
  }

  responseHeaders.set("x-legal-wellness-origin", "approved-netlify-build");

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  let responseBody: BodyInit | null = method === "HEAD" ? null : upstreamResponse.body;
  let bodyModified = false;
  if (method !== "HEAD" && contentType.toLowerCase().includes("text/html")) {
    const html = await upstreamResponse.text();
    const transformed = transformApprovedOriginContent(html, contentType);
    responseBody = transformed;
    bodyModified = transformed !== html;
  } else if (
    method !== "HEAD" &&
    (contentType.toLowerCase().includes("javascript") || incomingUrl.pathname.endsWith(".js"))
  ) {
    const script = await upstreamResponse.text();
    const transformed = transformApprovedOriginContent(script, contentType);
    responseBody = transformed;
    bodyModified = transformed !== script;
  }

  if (bodyModified) {
    responseHeaders.delete("etag");
    responseHeaders.delete("last-modified");
  }

  return new Response(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
