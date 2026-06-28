// In tests there is no client/server boundary, so the `server-only` guard is a
// no-op. vitest.config.ts aliases the "server-only" import to this empty module
// so server-only files (e.g. lib/rates/provider.ts) can be unit-tested.
export {};
