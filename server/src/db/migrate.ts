import fs from "fs";
import path from "path";
import sql from "./client";

async function migrate() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("Running migrations against Neon DB...");
  for (const file of files) {
    const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`  Running ${file}...`);
    await sql.unsafe(migrationSQL);
  }
  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
