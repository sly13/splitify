import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  define: {
    // Устанавливаем продакшн API URL по умолчанию
    "import.meta.env.VITE_API_URL": JSON.stringify(
      process.env.NODE_ENV === "production"
        ? "https://api-splitify.vadimsemenko.ru"
        : "https://api-splitify.vadimsemenko.ru"
    ),
  },
});
