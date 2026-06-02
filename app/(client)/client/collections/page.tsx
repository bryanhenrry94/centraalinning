import React, { Suspense } from "react";
import { Box } from "@mui/material";
import CollectionTable from "@/components/collection/collection-table";
import LoadingUI from "@/components/ui/loading-ui";

const CollectionsPage = async () => {
  return (
    <Box sx={{ m: 4 }}>
      <Suspense fallback={<LoadingUI />}>
        <CollectionTable />
      </Suspense>
    </Box>
  );
};

export default CollectionsPage;
