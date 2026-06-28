import type { MetadataRoute } from "next";

// Web app manifest so CuanQuest can be installed to the home screen and launch
// fullscreen ("Add to Home Screen"). Next auto-links it from the <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CuanQuest — Naik Level dengan Menabung",
    short_name: "CuanQuest",
    description:
      "Lacak akumulasi tabunganmu dan naik level ala RPG. Mulai dari nol.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
