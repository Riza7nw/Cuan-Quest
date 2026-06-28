"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Thin wrapper so the root layout can stay a Server Component while next-themes
// (which needs the client) manages the .dark class the Tailwind v4 dark variant
// keys off of.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
