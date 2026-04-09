import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Mock prisma
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    post: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}));


const JWT_SECRET = process.env.JWT_SECRET || "supersecurejwtkey123";

describe("Smart API Hub - Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Health check (Happy path)
  it("GET /health should return 200 and OK", async () => {
    // mock database ping logic inside DB by mocking prisma.$queryRaw
    prisma.$queryRaw = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  // 2. Register - Lỗi 400 (Zod format email sai)
  it("POST /auth/register should return 400 for invalid email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "notanemail", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid email format");
  });

  // 3. Register - Happy path
  it("POST /auth/register should create user and return 201", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 1, email: "test@test.com", password: "hashed", name: null, role: "user", createdAt: new Date(), updatedAt: new Date()
    } as any);

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@test.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Registration successful");
    expect(res.body.user).toBeDefined();
  });

  // 4. Login - Lỗi 401 (Sai password)
  it("POST /auth/login should return 401 for wrong credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  // 5. Dynamic CRUD GET - Happy path (Lấy danh sách posts có count)
  it("GET /api/posts should return list and X-Total-Count", async () => {
    vi.mocked(prisma.post.count).mockResolvedValue(2);
    vi.mocked(prisma.post.findMany).mockResolvedValue([{ id: 1, title: "A" }, { id: 2, title: "B" }] as any);
    
    const res = await request(app).get("/api/posts?_page=1&_limit=2");
    expect(res.status).toBe(200);
    expect(res.headers["x-total-count"]).toBe("2");
    expect(res.body).toHaveLength(2);
  });

  // 6. Dynamic CRUD POST - Lỗi 401 (Chưa đăng nhập)
  it("POST /api/posts should return 401 without Token", async () => {
    const res = await request(app).post("/api/posts").send({ title: "New Post", authorId: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Not authorized");
  });

  // 7. Dynamic CRUD POST - Lỗi 400 (Zod Schema)
  it("POST /api/posts should return 400 for invalid data", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, JWT_SECRET);
    // Thiếu trường authorId (required trong posts schema)
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Missing authorId" });
    expect(res.status).toBe(400);
  });

  // 8. Dynamic CRUD PUT - Happy path
  it("PUT /api/posts/1 should update entirely", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, JWT_SECRET);
    vi.mocked(prisma.post.update).mockResolvedValue({ id: 1, title: "Updated", authorId: 1 } as any);

    const res = await request(app)
      .put("/api/posts/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated", content: "hi", authorId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated");
  });

  // 9. Lỗi 404 - Not Found Route
  it("GET /does-not-exist should return 404", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
  });

  // 10. Lỗi 403 - Dynamic Delete (Chỉ Admin)
  it("DELETE /api/posts/1 should return 403 for normal user", async () => {
    const token = jwt.sign({ id: 1, role: "user" }, JWT_SECRET); // role = user
    const res = await request(app)
      .delete("/api/posts/1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Not authorized as an admin");
  });
});
