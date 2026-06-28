import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRates } from "@/lib/rates/provider";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchRates", () => {
  it("returns pivot-only and skips the network when no foreign symbols", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const r = await fetchRates(["EUR"]);
    expect(r.rates).toEqual({ EUR: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("falls back to the second host when the first throws", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        if (call === 1) throw new Error("primary down");
        return new Response(
          JSON.stringify({ date: "2026-06-27", rates: { USD: 1.08 } }),
          { status: 200 }
        );
      })
    );
    const r = await fetchRates(["USD"]);
    expect(call).toBe(2);
    expect(r.rates).toEqual({ EUR: 1, USD: 1.08 });
    expect(r.date).toBe("2026-06-27");
  });

  it("throws when every host fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      })
    );
    await expect(fetchRates(["USD"])).rejects.toThrow(/Rate fetch failed/);
  });

  it("treats an empty rates payload as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ rates: {} }), { status: 200 }))
    );
    await expect(fetchRates(["USD"])).rejects.toThrow();
  });

  it("treats a non-200 response as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 }))
    );
    await expect(fetchRates(["USD"])).rejects.toThrow();
  });
});
