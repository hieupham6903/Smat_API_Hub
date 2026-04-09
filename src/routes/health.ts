

import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /health
router.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now(); 

  try {
    // --- Ping Database ---
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime; // tính độ trễ (ms)

    // Trả về status OK kèm thông tin hệ thống
    res.status(200).json({
      status: "ok",
      message: "Server is running",
      timestamp: new Date().toISOString(),
      database: {
        status: "connected",
        latency_ms: latency,
      },
      environment: process.env["NODE_ENV"] ?? "development",
      version: "1.0.0",
    });
  } catch (error) {
    const latency = Date.now() - startTime;

    res.status(503).json({
      status: "error",
      message: "Server is running but database connection failed",
      timestamp: new Date().toISOString(),
      database: {
        status: "disconnected",
        latency_ms: latency,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export default router;
