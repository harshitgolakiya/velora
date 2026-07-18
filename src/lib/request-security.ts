import "server-only";

import { NextResponse } from "next/server";

function normalizedOrigin(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function allowedOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const configured = normalizedOrigin(process.env.NEXTAUTH_URL)
    ?? normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  return Array.from(new Set([configured, requestUrl.origin].filter((origin): origin is string => Boolean(origin))));
}

export function isSameOriginRequest(request: Request) {
  const allowed = allowedOrigins(request);
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (origin) return allowed.includes(origin);

  const referer = normalizedOrigin(request.headers.get("referer"));
  return Boolean(referer && allowed.includes(referer));
}

export function requireSameOriginRequest(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return NextResponse.json(
    { message: "Security check failed. Refresh the page and try again." },
    { status: 403 },
  );
}
