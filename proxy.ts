import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session-token";

export async function proxy(request: NextRequest) {
  if (process.env.APP_ENV !== "production") return NextResponse.next();

  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isPublicApi = path === "/api/auth/login" || path === "/api/health";
  const isLogin = path === "/login";
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (isPublicApi) return NextResponse.next();

  if (isApi && !isPublicApi && !session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!session && !isLogin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
