import React from "react";
// mui
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Box, Typography } from "@mui/material";
import Link from "next/link";

interface ActionButtonsProps {
  step: number;
  handleBack: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = (props) => {
  const { step, handleBack } = props;

  return (
    <>
    
    </>
  );
};

export default ActionButtons;
