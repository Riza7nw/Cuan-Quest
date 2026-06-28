import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": root,
      // No client/server boundary in tests — stub the guard so server-only
      // modules (e.g. lib/rates/provider.ts) are importable.
      "server-only": path.join(root, "test/server-only-stub.ts"),
    },
  },
});
