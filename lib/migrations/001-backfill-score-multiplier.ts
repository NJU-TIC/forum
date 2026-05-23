import { getCollection } from "@/lib/mongodb";
import { listGameFiles, getGameFileContent } from "@/lib/cos";
import { minify } from "terser";
import { ObjectId } from "mongodb";
import type { Migration } from "@/lib/db/migrations";

const JS_FILE_PATTERN = /\.(?:js|mjs)$/i;
const JS_CHAR_LIMIT = 10000;

function computeScoreMultiplier(totalMinifiedJsChars: number): number {
  const excessChars = Math.max(0, totalMinifiedJsChars - JS_CHAR_LIMIT);
  return Math.exp(-0.8 * (excessChars / JS_CHAR_LIMIT));
}

async function up(): Promise<void> {
  const gamesCollection = await getCollection("games");
  const games = await gamesCollection
    .find({ scoreMultiplier: { $exists: false } })
    .toArray();

  console.log(`[migration] backfill-score-multiplier: ${games.length} game(s) to process`);

  for (const game of games) {
    const gameId = (game._id as ObjectId).toString();
    try {
      const allFiles = await listGameFiles(gameId);
      const jsFiles = allFiles.filter((f) => JS_FILE_PATTERN.test(f));

      let totalMinifiedChars = 0;
      for (const jsFile of jsFiles) {
        const content = await getGameFileContent(gameId, jsFile);
        const result = await minify(
          { [jsFile]: content.toString("utf8") },
          { compress: true, mangle: true },
        );
        totalMinifiedChars += (result.code ?? "").length;
      }

      const multiplier = computeScoreMultiplier(totalMinifiedChars);
      await gamesCollection.updateOne(
        { _id: game._id },
        { $set: { scoreMultiplier: multiplier, updatedAt: new Date() } },
      );
      console.log(`[migration]   ${gameId}: ${totalMinifiedChars} chars → multiplier ${multiplier.toFixed(6)}`);
    } catch (err) {
      // Log but continue — one bad game shouldn't abort the whole migration.
      console.error(`[migration]   ${gameId}: failed`, err);
    }
  }
}

export const backfillScoreMultiplier: Migration = {
  name: "001-backfill-score-multiplier",
  up,
};
