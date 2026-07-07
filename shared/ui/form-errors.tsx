import React from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

interface FormErrorsProps {
  errors: Record<string, any>;
}

const FormErrors: React.FC<FormErrorsProps> = ({ errors }) => {
  if (Object.keys(errors).length === 0) return null;

  const renderErrorList = (errs: Record<string, any>) => {
    return Object.entries(errs).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        // Para errores en arrays como incomes
        return value.flatMap((itemError, idx) =>
          itemError
            ? Object.entries(itemError).map(([subKey, subVal]: [string, any]) =>
                subVal?.message ? (
                  <ListItem key={`${key}.${idx}.${subKey}`} sx={{ py: 0 }}>
                    <ListItemText
                      primary={`${key}[${idx}].${subKey}: ${subVal.message}`}
                      primaryTypographyProps={{
                        color: "error",
                        variant: "body2",
                      }}
                    />
                  </ListItem>
                ) : null
              )
            : []
        );
      }
      return value?.message ? (
        <ListItem key={key} sx={{ py: 0 }}>
          <ListItemText
            primary={`${key}: ${value.message}`}
            primaryTypographyProps={{ color: "error", variant: "body2" }}
          />
        </ListItem>
      ) : (
        []
      );
    });
  };

  return (
    <Box mt={2} mb={2}>
      <Paper elevation={0} sx={{ backgroundColor: "#fff3e0", p: 2 }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Corrige los siguientes errores:
        </Typography>
        <List dense>{renderErrorList(errors)}</List>
      </Paper>
    </Box>
  );
};

export default FormErrors;
