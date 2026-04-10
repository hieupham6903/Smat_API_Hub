import { autoMigrateDatabase } from "../lib/auto-migrate.js";

// Trên Vercel Build, ta muốn chạy db push luôn để cập nhật table lên Database
// vì Vercel Runtime không thể chạy được do Read-Only filesystem.
// Luôn luôn chỉ sinh file (onlyGenerate = true) trong quá trình BUILD.
// Việc push Database thực sự sẽ do App thực hiện lúc Runtime khi có kết nối DB.
autoMigrateDatabase(true);


