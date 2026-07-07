"use client";
import React, { useEffect } from "react";
import VerdictFormPage from "@/modules/verdict/components/verdict-form";
import { VerdictProvider } from "@/modules/verdict/contexts/verdict.context";
import { Box } from "@mui/material";
import { useParams } from "next/navigation";
import { getVerdictById } from "@/modules/verdict/actions/verdict.actions";

const VerdictPageEdit: React.FC = () => {
  const params = useParams();
  const id = (params.id as string) || "";
  const [verdictData, setVerdictData] = React.useState<any>(null);

  useEffect(() => {
    if (id) {
      const fetchVerdict = async () => {
        const verdict = await getVerdictById(id);
        if (verdict) {
          console.log("Fetched verdict:", verdict);
          setVerdictData(verdict);
        }
      };
      fetchVerdict();
    }
  }, [id]);

  return (
    <Box sx={{ m: 4 }}>
      <Box sx={{ mt: 2 }}>
        <VerdictProvider>
          <VerdictFormPage
            id={id}
            defaultValues={verdictData}
            modeEdit={true}
          />
        </VerdictProvider>
      </Box>
    </Box>
  );
};

export default VerdictPageEdit;
