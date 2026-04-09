// ============================================================
// PRISMA CONFIG - prisma.config.ts
// Prisma v7: tất cả config kết nối DB đặt ở đây
// ============================================================

import "dotenv/config"; // load .env trước
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Đường dẫn đến file schema
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  // Kết nối database — đọc từ biến môi trường DATABASE_URL
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
