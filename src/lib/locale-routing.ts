import { NextResponse, type NextRequest } from "next/server";

function isExcluded(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/admin-login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  );
}

export function handleLocaleRouting(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isExcluded(pathname)) return NextResponse.next();

  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/ar" ? "/" : pathname.slice(3);

    const headers = new Headers(request.headers);
    headers.set("x-velora-locale", "ar");

    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next();
}
