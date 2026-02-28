import fs from "fs";
import path from "path";
import sql from "./client";

async function migrate() {
  const migrationPath = path.join(__dirname, "migrations", "001_init.sql");
  const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

  console.log("Running migrations against Neon DB...");
  await sql.unsafe(migrationSQL);
  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
