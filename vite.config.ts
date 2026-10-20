import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (/PlanetForge/) and inside Capacitor.
  base: "./",
  build: { target: "es2022" },
  test: { include: ["src/**/*.test.ts", "supabase/**/*.test.ts"] },
});
