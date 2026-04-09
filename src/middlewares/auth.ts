
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./error-handler.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Not authorized, no token", 401));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new AppError("Not authorized, no token", 401));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Gắn user thông tin vào request
    (req as any).user = decoded;
    next();
  } catch (error) {
    next(new AppError("Not authorized, token failed", 401));
  }
}

export function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user && user.role === "admin") {
    next();
  } else {
    next(new AppError("Not authorized as an admin", 403));
  }
}
