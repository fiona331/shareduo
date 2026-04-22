import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Response-header belt-and-suspenders for manage/delete URLs.
 *
 * These URLs contain the secret_token as a query param, so they must never:
 *   - be indexed by search engines / AI crawlers / archive.org
 *   - leak in Referer when the owner clicks a link on the page
 *
 * The page-level `metadata` export handles HTML `<meta name=robots>`, but
 * some crawlers only look at the X-Robots-Tag response header, and some
 * clients (link-unfurlers, archive bots) skip HTML parsing entirely.
 */
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex"
  );
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/manage/:path*", "/delete/:path*"],
};
