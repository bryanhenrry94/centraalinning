import { r2Client } from "@/lib/r2-client";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function downloadFile(key: string): Promise<Uint8Array> {
  console.log("Bucket:", process.env.R2_BUCKET);
  console.log("Key:", key);

  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("File not found");
  }

  return new Uint8Array(await response.Body.transformToByteArray());
}
