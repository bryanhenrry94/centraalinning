import { Box, Card, Skeleton, Stack } from "@mui/material";

export default function LoadingParametersPage() {
  return (
    <Box>
      <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />

      <Card sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} mb={4}>
          <Skeleton variant="rounded" width={120} height={40} />

          <Skeleton variant="rounded" width={120} height={40} />

          <Skeleton variant="rounded" width={120} height={40} />
        </Stack>

        <Stack spacing={3}>
          <Skeleton variant="rounded" height={56} />

          <Skeleton variant="rounded" height={56} />

          <Skeleton variant="rounded" height={56} />

          <Skeleton variant="rounded" height={120} />
        </Stack>
      </Card>
    </Box>
  );
}
