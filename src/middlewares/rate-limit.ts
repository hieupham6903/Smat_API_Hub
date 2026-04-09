
import type { Request, Response, NextFunction } from "express";

// Cấu hình giới hạn
const WINDOW_MS = 60 * 1000;  
const MAX_REQUESTS = 100;    

// Storage lưu trong RAM 
interface RateLimitData {
  count: number;
  resetTime: number;
}
const ipCache = new Map<string, RateLimitData>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Lấy IP của người dùng
  const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
  const now = Date.now();

  // Đọc dữ liệu IP này trong bộ đệm
  let record = ipCache.get(ip);

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
  }

  record.count++;
  ipCache.set(ip, record);

  const remaining = Math.max(0, MAX_REQUESTS - record.count);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Quá nhiều Request (Too Many Requests). Vui lòng thử lại sau!",
      retryAfter: Math.ceil((record.resetTime - now) / 1000) + " giây"
    });
  }

  return next();
}

// Hàm dọn dẹp bộ nhớ RAM theo chu kỳ 5 phút 
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipCache.entries()) {
    if (now > data.resetTime) {
      ipCache.delete(ip);
    }
  }
}, 5 * 60 * 1000);
