import { findAllGames } from "@/lib/db/game";
import { findUserById } from "@/lib/db";
import { GameCard } from "@/components/games/GameCard";
import { getCurrentUser } from "@/app/actions/auth";
import Link from "next/link";
import type { SGame } from "@/schema/game";
import type { SUser } from "@/schema/user";

type PopulatedGame = SGame & { author: SUser; createdAt: Date };

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
      };
    })
    .filter((game): game is PopulatedGame => game !== null);
}

export default async function GamesPage() {
  const games = await findAllGames();
  const populatedGames = await populateGamesWithAuthors(games);
  const currentUser = await getCurrentUser();
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

      {populatedGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No games yet. Be the first to upload one!
          </p>
        </div>
      ) : (
        <div>
          {populatedGames.map((game) => (
            <GameCard key={game._id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
