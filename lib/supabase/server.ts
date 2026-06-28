import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/lib/database.types";

// Server Supabase client bound to the request's cookies (RLS-scoped to the
// signed-in user). cookies() is async in Next 16.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, where setting cookies is not
            // allowed. Safe to ignore — the proxy (middleware) refreshes the session.
          }
        },
      },
    }
  );
}

// auth.getUser() is a network round-trip to the Supabase auth server. The layout
// and the page both need the user, so dedupe it within a single request render
// via React cache() — one round-trip per navigation instead of one per component.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
