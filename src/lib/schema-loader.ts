

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
    "schema.json",
    "/var/task/schema.json" // Vercel standard path
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw) as SchemaDefinition;
      } catch (e) {
        console.error(`[Schema-Loader] Found schema.json at ${p} but failed to parse:`, e);
      }
    }
  }

  // Fallback cực kỳ an toàn để không sập App khi load module (Vercel Boot)
  console.error("[Schema-Loader] CRITICAL: schema.json not found in any path.");
  return { tables: {} }; 
}




// Lấy danh sách tên bảng hợp lệ (dùng để whitelist chống Injection)
export function getValidTableNames(schema: SchemaDefinition): Set<string> {
  return new Set(Object.keys(schema.tables));
}
