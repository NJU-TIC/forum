import { getCollection } from "@/lib/mongodb";
import { MongoServerError } from "mongodb";

export interface Migration {
  name: string;
  up: () => Promise<void>;
}

export async function runMigrations(migrations: Migration[]): Promise<void> {
  const col = await getCollection("migrations");
  await col.createIndex({ name: 1 }, { unique: true });

  for (const migration of migrations) {
    let claimed = false;
    try {
      await col.insertOne({ name: migration.name, runAt: new Date() });
      claimed = true;
      console.log(`[migration] running: ${migration.name}`);
      await migration.up();
      console.log(`[migration] done:    ${migration.name}`);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        // Another instance already ran (or is running) this migration — skip.
        continue;
      }
      if (claimed) {
        // Migration failed after being claimed; remove record so it can be retried on next deploy.
        await col.deleteOne({ name: migration.name }).catch(() => null);
      }
      console.error(`[migration] failed:  ${migration.name}`, err);
      // Don't rethrow — let the app start even if a migration fails.
    }
  }
}
