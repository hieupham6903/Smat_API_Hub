

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
  const possiblePaths = [
    path.join(process.cwd(), "schema.json"),
    path.join(__dirname, "..", "..", "schema.json"),
    path.resolve("schema.json")
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw) as SchemaDefinition;
      } catch (e) {
        console.error(`[Schema-Loader] Error parsing JSON at ${p}:`, e);
      }
    }
  }

  console.error("[Schema-Loader] All possible paths for schema.json failed.");
  throw new Error("schema.json not found in any expected location.");
}



// Lấy danh sách tên bảng hợp lệ (dùng để whitelist chống Injection)
export function getValidTableNames(schema: SchemaDefinition): Set<string> {
  return new Set(Object.keys(schema.tables));
}
