import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4040,
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ab710ea9a264.ngrok-free.app",
      ".ngrok-free.app",
      ".ngrok.io",
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  define: {
    // Устанавливаем продакшн API URL по умолчанию
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      process.env.NODE_ENV === "production"
        ? "https://api-splitify.vadimsemenko.ru/api"
        : "http://localhost:4041/api"
    ),
    "import.meta.env.VITE_SOCKET_URL": JSON.stringify(
      process.env.NODE_ENV === "production"
        ? "https://api-splitify.vadimsemenko.ru"
        : "http://localhost:4041"
    ),
  },
});
