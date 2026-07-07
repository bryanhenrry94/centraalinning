"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Checkbox,
  Link,
  Box,
} from "@mui/material";
import TermsAndConditions from "./terms-and-conditions";
import { ITenantSignUp } from "@/lib/validations/signup";

interface AccountInfoCardProps {
  initial: ITenantSignUp;
  setFormData: (data: ITenantSignUp) => void;
}

const TermsAndConditionsCard = (props: AccountInfoCardProps) => {
  const { initial, setFormData } = props;
  const [showMore, setShowMore] = useState(false);

  const handleReadMore = () => {
    setShowMore(!showMore);
  };

  return (
    <Card sx={{ width: "100%" }}>
      <CardContent>
        <Box
          display="flex"
          justifyContent="center"
          flexDirection="column"
          alignItems="center"
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", marginTop: 1 }}>
            Algemeen Voorwaarden
          </Typography>
        </Box>

        {/* Texto de los términos */}
        <Box sx={{ maxHeight: "50vh", overflowY: "auto", marginTop: 2 }}>
          <TermsAndConditions />
        </Box>
        <Box display="flex" justifyContent="center">
          <Link
            component="button"
            variant="body2"
            sx={{ display: "block", marginTop: 1 }}
            onClick={handleReadMore}
          ></Link>
        </Box>

        {/* Check para aceptar los términos */}
        <Box display="flex" alignItems="center" marginTop={2}>
          <Checkbox
            checked={initial.company.terms_accepted}
            onChange={(e) =>
              setFormData({
                ...initial,
                company: {
                  ...initial.company,
                  terms_accepted: e.target.checked,
                },
              })
            }
            color="primary"
          />
          <Typography variant="body2">
            Ik accepteer de algemene voorwaarden
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TermsAndConditionsCard;
