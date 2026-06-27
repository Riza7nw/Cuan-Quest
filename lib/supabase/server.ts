import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Supabase client bound to the request's cookies (RLS-scoped to the
// signed-in user). cookies() is async in Next 16.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
