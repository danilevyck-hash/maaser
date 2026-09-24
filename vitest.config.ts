import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
  },
  // El repo compila con jsx: "preserve" (lo transforma Next). Vitest necesita
  // que alguien transforme el JSX de las pruebas de pantalla.
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
