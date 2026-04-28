import "server-only";
import COS from "cos-nodejs-sdk-v5";
import { config } from "./config";

console.log("[COS] Initializing with Bucket:", config.cosBucket, "Region:", config.cosRegion, "SecretId:", config.cosSecretId ? "set" : "missing");

const cos = new COS({
  SecretId: config.cosSecretId,
  SecretKey: config.cosSecretKey,
});

const Bucket = config.cosBucket;
const Region = config.cosRegion;

export function getGameUrl(gameId: string): string {
  return `${config.cosPublicUrl}/${gameId}/index.html`;
}

export async function uploadGameFile(
  gameId: string,
  filePath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  const key = `${gameId}/${filePath}`;

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket,
        Region,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=3600",
      },
      (err, data) => {
        if (err) {
          console.error(`[COS] putObject failed: key=${key}`, err.statusCode, err.code, err.message);
          reject(err);
        } else {
          console.log(`[COS] putObject OK: key=${key} statusCode=${data?.statusCode}`);
          resolve();
        }
      },
    );
  });
}

export async function uploadGameFiles(
  gameId: string,
  files: { path: string; data: Buffer; contentType: string }[],
): Promise<void> {
  await Promise.all(
    files.map((file) =>
      uploadGameFile(gameId, file.path, file.data, file.contentType),
    ),
  );
}

export async function deleteGameFiles(gameId: string): Promise<void> {
  // List all objects with the game prefix
  const objects = await new Promise<COS.CosObject[]>(
    (resolve, reject) => {
      cos.getBucket(
        {
          Bucket,
          Region,
          Prefix: `${gameId}/`,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data.Contents);
        },
      );
    },
  );

  if (!objects || objects.length === 0) return;

  // Delete all objects in batch
  await new Promise<void>((resolve, reject) => {
    cos.deleteMultipleObject(
      {
        Bucket,
        Region,
        Objects: objects.map((obj) => ({ Key: obj.Key })),
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}
