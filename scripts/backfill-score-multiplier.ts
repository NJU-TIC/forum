import { getCollection } from "../lib/mongodb";
import { updateGameScoreMultiplier } from "../lib/db/game";
import { listGameFiles, getGameFileContent } from "../lib/cos";
import { minify } from "terser";

const JS_FILE_PATTERN = /\.(?:js|mjs)$/i;
const JS_CHAR_LIMIT = 10000;

function computeScoreMultiplier(totalMinifiedJsChars: number): number {
  const excessChars = Math.max(0, totalMinifiedJsChars - JS_CHAR_LIMIT);
  return Math.exp(-0.8 * (excessChars / JS_CHAR_LIMIT));
}

async function backfillScoreMultipliers() {
  const gamesCollection = await getCollection("games");

  // Only process games that were created before this field was added
  const games = await gamesCollection
    .find({ scoreMultiplier: { $exists: false } })
    .toArray();

  console.log(`Found ${games.length} game(s) without scoreMultiplier`);

  for (const game of games) {
    const gameId = game._id.toString();
    const title = (game.title as string) ?? gameId;
    console.log(`\nProcessing: "${title}" (${gameId})`);

    try {
      const allFiles = await listGameFiles(gameId);
      const jsFiles = allFiles.filter((f) => JS_FILE_PATTERN.test(f));

      if (jsFiles.length === 0) {
        console.log("  No JS files found — setting multiplier to 1.0");
        await updateGameScoreMultiplier(gameId, 1.0);
        continue;
      }

      let totalMinifiedChars = 0;

      for (const jsFile of jsFiles) {
        const content = await getGameFileContent(gameId, jsFile);
        const result = await minify(
          { [jsFile]: content.toString("utf8") },
          { compress: true, mangle: true },
        );
        const chars = (result.code ?? "").length;
        console.log(`  ${jsFile}: ${chars} minified chars`);
        totalMinifiedChars += chars;
      }

      const multiplier = computeScoreMultiplier(totalMinifiedChars);
      console.log(
        `  Total: ${totalMinifiedChars} chars (limit ${JS_CHAR_LIMIT}) → multiplier = ${multiplier.toFixed(6)}`,
      );

      await updateGameScoreMultiplier(gameId, multiplier);
      console.log(`  Updated.`);
    } catch (err) {
      console.error(`  ERROR processing ${gameId}:`, err);
    }
  }

  console.log("\nBackfill complete.");
  process.exit(0);
}

backfillScoreMultipliers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
