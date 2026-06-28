import { describe, it, expect } from "vitest";
import { isCronAuthorized } from "@/lib/cron-auth";

const secret = "20a024f53b43b5c17d4c0499a262510955ad17578c6e9f27";

describe("isCronAuthorized", () => {
  it("accepts the correct bearer token", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("rejects a wrong token of the same length", () => {
    const wrong = "x".repeat(secret.length);
    expect(isCronAuthorized(`Bearer ${wrong}`, secret)).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(isCronAuthorized(null, secret)).toBe(false);
  });
  it("rejects a token of a different length", () => {
    expect(isCronAuthorized(`Bearer ${secret}extra`, secret)).toBe(false);
  });
  it("rejects when no secret is configured", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, undefined)).toBe(false);
  });
  it("rejects a raw secret without the Bearer prefix", () => {
    expect(isCronAuthorized(secret, secret)).toBe(false);
  });
});
