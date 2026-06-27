import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshExchangeRates } from "@/lib/rates/provider";

// Daily exchange-rate refresh. Triggered by Vercel Cron (see vercel.json), which
// sends `Authorization: Bearer <CRON_SECRET>`. The proxy matcher skips this path,
// so it does its own auth. Runs on Node (service-role client needs the secret).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
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
