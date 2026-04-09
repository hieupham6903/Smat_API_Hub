
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

// Đọc swagger file (Tìm path an toàn nhất cho cả dev và Vercel)
let swaggerDocument: any;
try {
  const possibleSwaggerPaths = [
    path.join(process.cwd(), "docker/swagger.yaml"),
    path.join(process.cwd(), "dist/docker/swagger.yaml"),
    path.resolve("docker/swagger.yaml")
  ];
  
  let swaggerPath: string | undefined;
  for (const p of possibleSwaggerPaths) {
    if (fs.existsSync(p)) {
      swaggerPath = p;
      break;
    }
  }
  
  if (swaggerPath) {
    const file = fs.readFileSync(swaggerPath, "utf8");
    swaggerDocument = yaml.parse(file);
  } else {
    throw new Error("Could not find swagger.yaml in any possible paths");
  }
} catch (e) {
  console.log("⚠️ Swagger loading skipped (deployment will continue):", (e as Error).message);
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
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css",
      customJs: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js",
      ]
    })
  );
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

    // Lưu ý: Không cần gọi await prisma.$connect() vì Prisma tự động Lazy Connect ở query đầu tiên.
    // Nếu gọi $connect ở đây mà DB bị timeout, Vercel sẽ tự sập app.

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log("\n========================================");
        console.log(`Smart API Hub is running!`);
        console.log(`Local: http://localhost:${PORT}`);
        console.log(`Health: http://localhost:${PORT}/health`);
        console.log(`Env: ${process.env["NODE_ENV"] ?? "development"}`);
        console.log("========================================\n");
      });
    }

  } catch (error) {
    console.error("Failed to start server locally (Ignored on Vercel to prevent hard crash):", error);
    // Vercel Serverless Function thỉnh thoảng sẽ giật lag lúc boot DB. 
    // Tránh sử dụng process.exit(1) ở đây để ứng dụng không bị sập hoàn toàn (Crash 500 Bất Đắc Dĩ).
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
