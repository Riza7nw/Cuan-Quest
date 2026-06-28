import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: Middleware is now "Proxy". Same functionality.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets, PWA metadata (manifest + icons,
    // which the browser fetches without an auth context), and the cron route
    // (own auth). Without excluding these the manifest 307s to /login and the
    // app can't be installed.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon|icon|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
