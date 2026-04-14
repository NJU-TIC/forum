import { findGameById } from "@/lib/db/game";
import { findUserById } from "@/lib/db";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/games/GamePlayer";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await findGameById(id);

  if (!game) notFound();

  const author = await findUserById(game.author);
  if (!author) notFound();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{game.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          By {author.name}
          {author.isAdmin && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              Admin
            </span>
          )}
        </p>
        <p className="text-gray-600 mt-2">{game.description}</p>
      </div>
      <GamePlayer gameId={id} />
    </div>
  );
}
