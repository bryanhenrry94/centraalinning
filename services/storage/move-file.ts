import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { r2Client } from "@/lib/r2-client";

export async function moveFile(sourceKey: string, destinationKey: string) {
  const bucket = process.env.R2_BUCKET!;

  await r2Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destinationKey,
    }),
  );

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: sourceKey,
    }),
  );
}
