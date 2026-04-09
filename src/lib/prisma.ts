
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env["DATABASE_URL"];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Khai báo biến global để lưu instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Nếu chưa có instance → tạo mới; ngược lại tái sử dụng
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"], 
  });

// Lưu vào global để tái sử dụng khi hot-reload
if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
