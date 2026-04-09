
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { loadSchema } from "./schema-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function autoMigrateDatabase() {
  console.log("[Auto-Migrate] Bắt đầu đồng bộ schema.json sang Database...");
  const schema = loadSchema();

  // 1. Khởi tạo header của Prisma
  let prismaSchema = `// FILE ĐƯỢC TỰ ĐỘNG SINH RA TỪ schema.json (DO NOT EDIT MANUALLY)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
`;

  //  Tính toán trước danh sách Back-relations
  const reverseRelations: Record<string, string[]> = {};
  for (const [tName, tDef] of Object.entries(schema.tables)) {
    for (const [fName, fOps] of Object.entries(tDef.fields)) {
      if (fOps.reference) {
        const parentTable = fOps.reference;
        const childModelName = tName.charAt(0).toUpperCase() + tName.slice(1).replace(/s$/, "");
        const relName = tName;
        if (!reverseRelations[parentTable]) reverseRelations[parentTable] = [];
        reverseRelations[parentTable].push(`  ${relName} ${childModelName}[]`);
      }
    }
  }

  // Lặp qua các bảng trong schema.json để sinh Model
  for (const [tableName, tableDef] of Object.entries(schema.tables)) {
    // Viết hoa chữ cái đầu cho tên Model
    const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/s$/, "");
    
    prismaSchema += `\nmodel ${modelName} {\n`;
    prismaSchema += `  id        Int      @id @default(autoincrement())\n`;

    for (const [fieldName, fieldOptions] of Object.entries(tableDef.fields)) {
      // Nội suy Type
      let prismaType = "String";
      if (fieldOptions.type === "number") prismaType = "Int";
      else if (fieldOptions.type === "boolean") prismaType = "Boolean";
      else if (fieldOptions.type === "date") prismaType = "DateTime";

      // Bắt buộc hay Không
      const isRequired = fieldOptions.required ? "" : "?";
      const isUnique = fieldOptions.unique ? "@unique" : "";
      
      prismaSchema += `  ${fieldName.padEnd(10)} ${prismaType}${isRequired} ${isUnique}\n`;

      // Nếu có Reference (khoá ngoại) -> Xây dựng quan hệ
      if (fieldOptions.reference) {
        // Tên bảng reference 
        const refTable = fieldOptions.reference;
        const refModelName = refTable.charAt(0).toUpperCase() + refTable.slice(1).replace(/s$/, "");
        const relName = fieldName.replace(/Id$/, "");
        prismaSchema += `  ${relName.padEnd(10)} ${refModelName}${isRequired} @relation(fields: [${fieldName}], references: [id], onDelete: Cascade)\n`;
      }
    }

    // Chèn các quan hệ ngược nếu có 
    if (reverseRelations[tableName]) {
      prismaSchema += `\n` + reverseRelations[tableName].join("\n") + `\n`;
    }

    // Các trường Timestamp mặc định
    prismaSchema += `\n  createdAt DateTime @default(now())\n`;
    prismaSchema += `  updatedAt DateTime @updatedAt\n`;
    prismaSchema += `  @@map("${tableName}")\n`;
    prismaSchema += `}\n`;
  }

  // 3. Ghi đè vào file schema.prisma
  const prismaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
  fs.writeFileSync(prismaPath, prismaSchema);
  console.log("✅ [Auto-Migrate] Cập nhật thành công file schema.prisma.");

  // 4. Chạy Push xuống Database
  try {
    console.log("⚙️ [Auto-Migrate] Đang chạy 'npx prisma db push' để tạo bảng Postgres...");
    // Thực thi lệnh shell (chạy đồng bộ)
    execSync("npx prisma generate", { stdio: "inherit", cwd: path.resolve(__dirname, "../..") });
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", cwd: path.resolve(__dirname, "../..") });
    console.log("[Auto-Migrate] Quá trình Migrate DB hoàn tất!");
  } catch (error) {
    console.error("[Auto-Migrate] Lỗi khi tạo bảng Database:", error);
    process.exit(1);
  }
}
