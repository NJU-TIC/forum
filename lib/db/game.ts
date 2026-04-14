import { getCollection } from "../mongodb";
import { validateGameSafe, validateQueriedGameSafe, createValidatedGame } from "../validation/game";
import { ObjectId, Binary } from "mongodb";
import { SGame } from "@/schema/game";

export interface GameFileData {
  gameId: string;
  path: string;
  content: Buffer;
  contentType: string;
}

export async function createGame(
  gameData: { author: string; title: string; description: string },
  files: GameFileData[],
): Promise<SGame> {
  const validatedGame = createValidatedGame(gameData);

  const gamesCollection = await getCollection("games");
  const result = await gamesCollection.insertOne(validatedGame);

  const gameId = result.insertedId.toString();

  // Store all files in game_files collection
  if (files.length > 0) {
    const gameFilesCollection = await getCollection("game_files");
    const fileDocs = files.map((file) => ({
      gameId: new ObjectId(gameId),
      path: file.path,
      content: new Binary(file.content),
      contentType: file.contentType,
      createdAt: new Date(),
    }));
    await gameFilesCollection.insertMany(fileDocs);
  }

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

export async function findGameFile(
  gameId: string,
  filePath: string,
): Promise<{ content: Buffer; contentType: string } | null> {
  const gameFilesCollection = await getCollection("game_files");
  const file = await gameFilesCollection.findOne({
    gameId: new ObjectId(gameId),
    path: filePath,
  });

  if (!file) return null;

  return {
    content: Buffer.from(file.content.buffer),
    contentType: file.contentType,
  };
}

export async function deleteGameById(id: string): Promise<boolean> {
  const gamesCollection = await getCollection("games");
  const result = await gamesCollection.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount > 0) {
    // Also delete all associated files
    const gameFilesCollection = await getCollection("game_files");
    await gameFilesCollection.deleteMany({ gameId: new ObjectId(id) });
  }

  return result.deletedCount > 0;
}
