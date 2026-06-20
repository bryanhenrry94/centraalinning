import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2-client";

type UploadFileInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export async function uploadFile({
  key,
  body,
  contentType,
}: UploadFileInput): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return key;
}