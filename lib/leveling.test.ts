import { describe, it, expect } from "vitest";
import { levelForXp, progressToNext } from "@/lib/leveling";

const L = [
  { level: 1, xp_required: 0, title: "Pemula" },
  { level: 2, xp_required: 1000000, title: "Penabung" },
  { level: 3, xp_required: 3000000, title: "Pengumpul" },
];

describe("levelForXp", () => {
  it("is level 1 at xp 0", () => expect(levelForXp(0, L)).toBe(1));
  it("stays level 1 just below threshold", () =>
    expect(levelForXp(999999, L)).toBe(1));
  it("hits level 2 exactly at threshold", () =>
    expect(levelForXp(1000000, L)).toBe(2));
  it("returns the highest satisfied level", () =>
    expect(levelForXp(5000000, L)).toBe(3));
  it("handles unsorted level input", () =>
    expect(levelForXp(1000000, [L[2], L[0], L[1]])).toBe(2));
});

describe("progressToNext", () => {
  it("computes pct + remaining toward next level", () => {
    const p = progressToNext(2000000, L);
    expect(p.current?.level).toBe(2);
    expect(p.next?.level).toBe(3);
    expect(p.remaining).toBe(1000000); // 3,000,000 - 2,000,000
    expect(Math.round(p.pct)).toBe(50); // (2M-1M)/(3M-1M)
  });
  it("starts at 0% just after a level threshold", () => {
    const p = progressToNext(1000000, L);
    expect(p.current?.level).toBe(2);
    expect(p.pct).toBe(0);
  });
  it("caps at 100% at max level", () => {
    const p = progressToNext(9999999, L);
    expect(p.next).toBeNull();
    expect(p.pct).toBe(100);
    expect(p.remaining).toBe(0);
  });
});
