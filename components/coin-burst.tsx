"use client";

// A brief coin shower for the moment a deposit lands. Render it keyed by an
// incrementing counter so each deposit re-mounts and replays the animation.
// Purely decorative + pointer-events-none, so it never blocks interaction.
export function CoinBurst() {
  const coins = Array.from({ length: 10 });
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {coins.map((_, i) => (
        <span
          key={i}
          className="coin-burst absolute text-2xl"
          style={{ left: `${8 + i * 9}%`, animationDelay: `${i * 45}ms` }}
        >
          💰
        </span>
      ))}
    </div>
  );
}
