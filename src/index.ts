
import "dotenv/config";

import express from "express";
import type { Request, Response } from "express";

import { prisma } from "./lib/prisma.js";

import { loadSchema, getValidTableNames } from "./lib/schema-loader.js";
import { autoMigrateDatabase } from "./lib/auto-migrate.js";

import healthRouter from "./routes/health.js";
import crudRouter from "./routes/crud.js";
import authRouter from "./routes/auth.js";

import swaggerUi from "swagger-ui-express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let swaggerDocument: any;
try {
  const file = fs.readFileSync(path.resolve(__dirname, "../docker/swagger.yaml"), "utf8");
  swaggerDocument = yaml.parse(file);
} catch (e) {
  console.log("No swagger.yaml found yet.", e);
}

import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";


export const app = express();
const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

import { rateLimiter } from "./middlewares/rate-limit.js";

app.use(rateLimiter);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res, next) => {
  if (process.env["NODE_ENV"] === "development") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});


app.use("/health", healthRouter);

app.use("/auth", authRouter);

app.use("/api", crudRouter);

if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Smart API Hub",
    version: "1.0.0",
    description: "Dynamic REST API platform — auto-generated from schema.json",
    docs: "/api-docs", 
    health: "/health",
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    console.log("📋 Loading schema.json...");
    
    // Trên Vercel Runtime, môi trường là Read-Only nên không thể ghi file schema.prisma hay gọi execSync.
    // Việc Migrate và Generate đã được chạy sẵn lúc Vercel Build (prebuild) rồi.
    if (!process.env.VERCEL) {
      autoMigrateDatabase();
    }

    const schema = loadSchema();
    const validTables = getValidTableNames(schema);
    console.log(`Schema loaded. Tables: ${[...validTables].join(", ")}`);

    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log("\n========================================");
      console.log(`Smart API Hub is running!`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Env: ${process.env["NODE_ENV"] ?? "development"}`);
      console.log("========================================\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}


process.on("SIGINT", async () => {
  console.log("\n⏹  Shutting down gracefully...");
  await prisma.$disconnect();
  console.log("Database disconnected. Bye!");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n⏹  SIGTERM received, shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}
