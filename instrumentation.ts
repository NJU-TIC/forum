export async function register() {
  // Only run in the Node.js runtime (not Edge). MongoDB is not available in Edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { runMigrations } = await import("@/lib/db/migrations");
    const { backfillScoreMultiplier } = await import(
      "@/lib/migrations/001-backfill-score-multiplier"
    );
    await runMigrations([backfillScoreMultiplier]);
  } catch (err) {
    console.error("[instrumentation] migration runner failed:", err);
  }
}
