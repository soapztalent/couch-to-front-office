import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { scorePlugin } from "./score-plugin";

export default defineConfig({
  plugins: [react(), scorePlugin()],
  server: { host: "0.0.0.0", port: 5173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
