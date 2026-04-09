

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

export function loadSchema(): SchemaDefinition {
  const schemaPath = path.resolve(__dirname, "../../schema.json");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.json not found at: ${schemaPath}`);
  }

  const raw = fs.readFileSync(schemaPath, "utf-8");

  try {
    return JSON.parse(raw) as SchemaDefinition;
  } catch {
    throw new Error("schema.json is not valid JSON");
  }
}

// Lấy danh sách tên bảng hợp lệ (dùng để whitelist chống Injection)
export function getValidTableNames(schema: SchemaDefinition): Set<string> {
  return new Set(Object.keys(schema.tables));
}
