

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SchemaField {
  type: "string" | "number" | "boolean" | "date"; 
  required?: boolean; 
  unique?: boolean;
  reference?: string; 
}

export interface SchemaTable {
  fields: Record<string, SchemaField>; 
}

export interface SchemaDefinition {
  tables: Record<string, SchemaTable>; 
}

import { createRequire } from "module";

export function loadSchema(): SchemaDefinition {
  try {
    // Sử dụng require để Vercel Bundler (@vercel/nft) 100% tự động nhận diện và đóng gói schema.json vào Serverless
    const require = createRequire(import.meta.url);
    const schema = require("../../schema.json");
    return schema as SchemaDefinition;
  } catch (error: any) {
    throw new Error(`schema.json không thể đọc được trên Vercel: ${error.message}`);
  }
}


// Lấy danh sách tên bảng hợp lệ (dùng để whitelist chống Injection)
export function getValidTableNames(schema: SchemaDefinition): Set<string> {
  return new Set(Object.keys(schema.tables));
}
