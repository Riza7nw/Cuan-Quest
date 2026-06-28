import { timingSafeEqual } from "node:crypto";

// Constant-time check of an `Authorization: Bearer <secret>` header. Using a
// plain `!==` would short-circuit on the first differing byte, leaking a
// timing signal that lets an attacker recover the secret byte by byte.
export function isCronAuthorized(
  header: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  const got = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual throws on unequal lengths; the length check itself leaks only
  // the secret's length, which is not sensitive.
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}
