

import type { Request, Response, NextFunction } from "express";


export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError"; 
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction 
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Nếu là AppError 
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Lỗi từ Prisma: bản ghi không tồn tại 
  if (err.message.includes("Record to") && err.message.includes("not found")) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  // Lỗi từ Prisma: vi phạm unique constraint
  if (err.message.includes("Unique constraint")) {
    res.status(409).json({ error: "Duplicate value, record already exists" });
    return;
  }

  // Mọi lỗi khác → 500 Internal Server Error
  const isDev = process.env["NODE_ENV"] === "development";
  res.status(500).json({
    error: "Internal server error",
    ...(isDev && { details: err.message }), 
  });
}

// Not Found Handler - bắt route không tồn tại (404)
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}
