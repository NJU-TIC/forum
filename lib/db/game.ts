import { getCollection } from "../mongodb";
import { validateQueriedGameSafe, createValidatedGame } from "../validation/game";
import { ObjectId } from "mongodb";
import { SGame } from "@/schema/game";

export async function createGame(
  gameData: { author: string; title: string; description: string },
): Promise<SGame> {
  const validatedGame = createValidatedGame(gameData);

  const gamesCollection = await getCollection("games");
  const result = await gamesCollection.insertOne(validatedGame);

  const gameId = result.insertedId.toString();

  return {
    ...validatedGame,
    _id: gameId,
  };
}

export async function findAllGames(): Promise<SGame[]> {
  const gamesCollection = await getCollection("games");
  const games = await gamesCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return games
    .map((game) => {
      const validatedGame = validateQueriedGameSafe(game);
      if (!validatedGame) return null;

      return {
        ...validatedGame,
        _id: game._id.toString(),
      };
    })
    .filter((game): game is SGame => game !== null);
}

export async function findGameById(id: string): Promise<SGame | null> {
  const gamesCollection = await getCollection("games");
  const game = await gamesCollection.findOne({ _id: new ObjectId(id) });

  if (!game) return null;

  const validatedGame = validateQueriedGameSafe(game);
  if (!validatedGame) return null;

  return {
    ...validatedGame,
    _id: game._id.toString(),
  };
}

export async function deleteGameById(id: string): Promise<boolean> {
  const gamesCollection = await getCollection("games");
  const result = await gamesCollection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
