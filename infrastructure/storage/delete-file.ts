import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/infrastructure/storage/r2-client";

export async function deleteFile(key: string) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    }),
  );
}
