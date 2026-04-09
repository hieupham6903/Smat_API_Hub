
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { loadSchema, getValidTableNames } from "../lib/schema-loader.js";
import { AppError } from "../middlewares/error-handler.js";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.js";

const router = Router();
const schema = loadSchema();
const validTables = getValidTableNames(schema);

// Mapping từ tên bảng plural sang model của prisma
const resourceMap: Record<string, string> = {
  users: "user",
  posts: "post",
  comments: "comment",
};

import { z } from "zod";

function generateZodSchema(resourceName: string, isPartial: boolean) {
  const resourceFields = schema.tables[resourceName]?.fields;
  if (!resourceFields) return z.any();

  const shape: any = {};
  for (const [key, field] of Object.entries(resourceFields)) {
    // Không cho phép validate update ID hoặc các metadata vì Prisma tự xử lý:
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;

    let zodType: any = z.any();
    if (field.type === "string") zodType = z.string();
    else if (field.type === "number") zodType = z.number();
    else if (field.type === "boolean") zodType = z.boolean();

    if (!isPartial && field.required) {
    } else {
      zodType = zodType.optional();
    }
    shape[key] = zodType;
  }
  return z.object(shape).strict();
}

// Middleware kiểm tra resource hợp lệ (Whitelist Validation)
function validateResource(req: Request, _res: Response, next: NextFunction) {
  const resource = String(req.params.resource).trim();
  if (!validTables.has(resource)) {
    return next(new AppError(`Resource '${resource}' not found or not mapped`, 404));
  }
  
  const modelName = resourceMap[resource];
  if (!modelName) {
    return next(new AppError(`Model mapped for resource '${resource}' is missing`, 500));
  }
  
  // Gắn model name vào req để các handler dưới dùng
  (req as any).modelName = modelName;
  next();
}


  //Dynamic GET /:resource (Advanced Query + Pagination)

  router.get("/:resource", validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceName = String(req.params.resource).trim();
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];

    // Lọc _fields
    let select: any = undefined;
    if (req.query._fields && typeof req.query._fields === "string") {
      select = {};
      req.query._fields.split(",").forEach(f => {
        select[f.trim()] = true;
      });
    }

    // Pagination & Sorting
    const pageStr = req.query._page;
    const limitStr = req.query._limit;
    const page = parseInt(typeof pageStr === "string" ? pageStr : "1", 10);
    const limit = parseInt(typeof limitStr === "string" ? limitStr : "10", 10);
    const skip = (page - 1) * limit;

    let orderBy: any = undefined;
    if (req.query._sort && typeof req.query._sort === "string") {
      const orderVal = req.query._order;
      const order = typeof orderVal === "string" && orderVal.toLowerCase() === "desc" ? "desc" : "asc";
      orderBy = { [req.query._sort]: order };
    }

    // Filtering & Search
    let where: any = {};
    
    // Search trên các cột text với q=keyword
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const q = req.query.q.trim();
      const resourceFields = schema.tables[resourceName]?.fields;
      if (resourceFields) {
        const textFields = Object.keys(resourceFields).filter(k => resourceFields[k]?.type === "string");
        if (textFields.length > 0) {
          where.OR = textFields.map(f => ({
            [f]: { contains: q, mode: 'insensitive' }
          }));
        }
      }
    }

    // Các query filters: _gte, _lte, _ne, _like
    for (const key in req.query) {
      if (key.startsWith("_") || key === "q") continue;
      
      const valQuery = req.query[key];
      if (typeof valQuery !== "string") continue;
      const val = valQuery;
      
      const resourceFields = schema.tables[resourceName]?.fields;
      
      // Chuyển kiểu dữ liệu theo schema 
      let parsedVal: any = val;
      if (resourceFields && resourceFields[key]) {
        if (resourceFields[key].type === "number") parsedVal = Number(val);
        if (resourceFields[key].type === "boolean") parsedVal = val === "true";
      }

      if (key.endsWith("_gte")) {
        const actualKey = key.replace("_gte", "");
        where[actualKey] = { ...where[actualKey], gte: parsedVal };
      } else if (key.endsWith("_lte")) {
        const actualKey = key.replace("_lte", "");
        where[actualKey] = { ...where[actualKey], lte: parsedVal };
      } else if (key.endsWith("_ne")) {
        const actualKey = key.replace("_ne", "");
        where[actualKey] = { ...where[actualKey], not: parsedVal };
      } else if (key.endsWith("_like")) {
        const actualKey = key.replace("_like", "");
        where[actualKey] = { ...where[actualKey], contains: parsedVal, mode: 'insensitive' };
      } else {
        where[key] = parsedVal;
      }
    }

    // Expand (lấy cha) & Embed (lấy con)
    let include: any = undefined;
    if (!select) {
      if (req.query._expand && typeof req.query._expand === "string") {
        include = include || {};
        const expandResource = req.query._expand.trim();
        if (expandResource === "users") include.author = true;
        else if (expandResource === "posts") include.post = true;
      }
      if (req.query._embed && typeof req.query._embed === "string") {
        include = include || {};
        const embedResource = req.query._embed.trim();
        if (embedResource === "posts") include.posts = true;
        if (embedResource === "comments") include.comments = true;
      }
    }

    // Đếm tổng để chia trang
    const totalCount = await model.count({ where });

    const data = await model.findMany({
      where,
      select,
      include,
      skip,
      take: limit,
      orderBy
    });

    res.setHeader("X-Total-Count", totalCount.toString());
    res.json(data);
  } catch (err) {
    next(err);
  }
});

  //get 1 item
  router.get("/:resource/:id", validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];
    const id = parseInt(String(req.params.id), 10);

    const record = await model.findUnique({ where: { id } });
    if (!record) {
      throw new AppError("Record not found", 404);
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Dynamic POST /:resource 
router.post("/:resource", authMiddleware, validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];
    const resourceName = String(req.params.resource).trim();

    // Validate request body
    const createSchema = generateZodSchema(resourceName, false);
    const parsedData = createSchema.parse(req.body);

    const data = await model.create({
      data: parsedData
    });
    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
    next(err);
  }
});


 // Dynamic PUT /:resource/:id 
router.put("/:resource/:id", authMiddleware, validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];
    const id = parseInt(String(req.params.id), 10);
    const resourceName = String(req.params.resource).trim();

    const putSchema = generateZodSchema(resourceName, false);
    const parsedData = putSchema.parse(req.body);

    const record = await model.update({
      where: { id },
      data: parsedData
    });
    res.json(record);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
    next(err);
  }
});


// Dynamic PATCH /:resource/:id 

router.patch("/:resource/:id", authMiddleware, validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];
    const id = parseInt(String(req.params.id), 10);
    const resourceName = String(req.params.resource).trim();

    const patchSchema = generateZodSchema(resourceName, true);
    const parsedData = patchSchema.parse(req.body);

    const record = await model.update({
      where: { id },
      data: parsedData
    });
    res.json(record);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
    next(err);
  }
});


 // Dynamic DELETE /:resource/:id (Chỉ Admin mới có quyền)

router.delete("/:resource/:id", authMiddleware, adminMiddleware, validateResource, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = (req as any).modelName;
    const model = (prisma as any)[modelName];
    const id = parseInt(String(req.params.id), 10);

    await model.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
