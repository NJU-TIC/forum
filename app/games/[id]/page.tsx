import { findGameById } from "@/lib/db/game";
import { findUserById, getGameTotalScores, getUserGameScoreSummary } from "@/lib/db";
import { getGameUrl } from "@/lib/cos";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/games/GamePlayer";
import { getCurrentUser } from "@/app/actions/auth";
import { GameScoreControl } from "@/components/games/GameScoreControl";
import { SCORE_BUDGET } from "@/lib/scoring";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await findGameById(id);
  const currentUser = await getCurrentUser();

  if (!game) notFound();

  const author = await findUserById(game.author);
  if (!author) notFound();

  const [gameTotalScoreMap, currentUserScoreSummary] = await Promise.all([
    getGameTotalScores([id]),
    currentUser ? getUserGameScoreSummary(currentUser.id) : null,
  ]);
  const gameTotalScore = gameTotalScoreMap.get(id) ?? 0;
  const currentUserScore = currentUserScoreSummary?.scores[id] ?? 0;
  const currentUserRemainingScore =
    currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET;

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
        {currentUser ? (
          <div className="mt-4 rounded-lg border bg-gray-50 px-4 py-3">
            <GameScoreControl
              gameId={id}
              initialScore={currentUserScore}
              initialTotalScore={gameTotalScore}
              initialRemainingScore={currentUserRemainingScore}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            总分：<span className="font-semibold text-gray-900">{gameTotalScore}</span>
          </p>
        )}
      </div>
      <GamePlayer gameUrl={getGameUrl(id)} />
    </div>
  );
}
