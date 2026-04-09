
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../middlewares/error-handler.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Schema Validation (Zod)
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: z.enum(["user", "admin"]).optional()
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});


router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input body
    const validatedData = registerSchema.parse(req.body);

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    if (existingUser) {
      throw new AppError("Email already exists", 400); // Bad Request
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    // Tạo user
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name ?? null,
        role: validatedData.role || "user"
      }
    });

    // Xóa password trong response
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({ message: "Registration successful", user: userWithoutPassword });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
    next(err);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    // So sánh password
    const isMatch = await bcrypt.compare(validatedData.password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    // Tạo JWT (hạn 1 ngày)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err: any) {
        if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
    next(err);
  }
});

export default router;
