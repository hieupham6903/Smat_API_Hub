import { autoMigrateDatabase } from "../lib/auto-migrate.js";

// Call generate strictly (do not push to database).
// This generates the schema.prisma strictly for building.
autoMigrateDatabase(true);
