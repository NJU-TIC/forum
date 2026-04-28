import { findAllGames } from "@/lib/db/game";
import { findUserById, getGameTotalScores, getUserGameScoreSummary } from "@/lib/db";
import { GameCard } from "@/components/games/GameCard";
import { getCurrentUser } from "@/app/actions/auth";
import Link from "next/link";
import type { SGame } from "@/schema/game";
import type { SUser } from "@/schema/user";
import { SCORE_BUDGET } from "@/lib/scoring";

type PopulatedGame = SGame & {
  author: SUser;
  createdAt: Date;
  gameTotalScore: number;
  currentUserScore: number;
  currentUserRemainingScore: number;
};

async function populateGamesWithAuthors(
  games: SGame[],
): Promise<PopulatedGame[]> {
  const authorIds = Array.from(new Set(games.map((game) => game.author)));
  const authors = await Promise.all(
    authorIds.map(async (id) => {
      const author = await findUserById(id);
      return author ? ([id, author] as const) : null;
    }),
  );

  const authorMap = new Map(
    authors.filter(
      (entry): entry is readonly [string, SUser] => entry !== null,
    ),
  );

  return games
    .map((game) => {
      const author = authorMap.get(game.author);
      if (!author) return null;

      return {
        ...game,
        author,
        createdAt: new Date(game.createdAt),
        gameTotalScore: 0,
        currentUserScore: 0,
        currentUserRemainingScore: SCORE_BUDGET,
      };
    })
    .filter((game): game is PopulatedGame => game !== null);
}

export default async function GamesPage() {
  const games = await findAllGames();
  const populatedGames = await populateGamesWithAuthors(games);
  const currentUser = await getCurrentUser();
  const gameIds = populatedGames.map((game) => game._id);
  const [gameTotalScoreMap, currentUserScoreSummary] = await Promise.all([
    getGameTotalScores(gameIds),
    currentUser ? getUserGameScoreSummary(currentUser.id) : null,
  ]);
  const populatedGamesWithScores = populatedGames.map((game) => ({
    ...game,
    gameTotalScore: gameTotalScoreMap.get(game._id) ?? 0,
    currentUserScore: currentUserScoreSummary?.scores[game._id] ?? 0,
    currentUserRemainingScore: currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET,
  }));
  const isLoggedIn = !!currentUser;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Games</h1>
        {isLoggedIn && (
          <Link
            href="/upload-game"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upload Game
          </Link>
        )}
      </div>
      {isLoggedIn && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          评分预算：已分配 {currentUserScoreSummary?.allocatedScore ?? 0}/{SCORE_BUDGET}
          ，剩余 {currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET}
        </div>
      )}

      {populatedGamesWithScores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No games yet. Be the first to upload one!
          </p>
        </div>
      ) : (
        <div>
          {populatedGamesWithScores.map((game) => (
            <GameCard
              key={game._id}
              game={game}
              currentUserId={currentUser?.id}
              initialRemainingScore={game.currentUserRemainingScore}
            />
          ))}
        </div>
      )}
    </div>
  );
}
