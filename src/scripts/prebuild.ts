import { autoMigrateDatabase } from "../lib/auto-migrate.js";

// Trên Vercel Build, ta muốn chạy db push luôn để cập nhật table lên Database
// vì Vercel Runtime không thể chạy được do Read-Only filesystem.
const isVercel = process.env.VERCEL === "1";
autoMigrateDatabase(!isVercel);
