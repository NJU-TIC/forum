import * as v from "valibot";
import { GameSchema, QueriedGameSchema } from "../../schema/game";

export function validateGame(data: unknown) {
  return v.parse(GameSchema, data);
}

export function validateGameSafe(data: unknown) {
  const result = v.safeParse(GameSchema, data);
  return result.success ? result.output : null;
}

export function validateQueriedGameSafe(data: unknown) {
  const result = v.safeParse(QueriedGameSchema, data);
  return result.success ? result.output : null;
}

export function createValidatedGame(data: {
  author: string;
  title: string;
  description: string;
}) {
  const gameData = {
    author: data.author,
    title: data.title,
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return validateGame(gameData);
}
