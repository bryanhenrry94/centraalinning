import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2-client";

export async function getFileUrl(
  key: string,
  expiresIn = 3600,
) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  });

  return getSignedUrl(
    r2Client,
    command,
    { expiresIn },
  );
}