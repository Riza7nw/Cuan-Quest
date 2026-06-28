import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshExchangeRates } from "@/lib/rates/provider";
import { isCronAuthorized } from "@/lib/cron-auth";

// Daily exchange-rate refresh. Triggered by Vercel Cron (see vercel.json), which
// sends `Authorization: Bearer <CRON_SECRET>`. The proxy matcher skips this path,
// so it does its own auth. Runs on Node (service-role client needs the secret).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Log the misconfiguration server-side but return the same opaque 401 as a
    // bad token, so a prober can't tell whether the endpoint is protected.
    console.error("CRON_SECRET not configured");
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshExchangeRates(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Leave the previous snapshot in place; the loop retries tomorrow.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
