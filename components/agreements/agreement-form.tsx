import React, { useEffect, useState } from "react";
import { Box, Button, Slider, Typography } from "@mui/material";
import {
  PaymentAgreement,
  PaymentAgreementCreate,
} from "@/lib/validations/payment-agreement";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface AgreementFormProps {
  initialData?: Partial<PaymentAgreement>;
  onSubmit: (data: Partial<PaymentAgreement>) => void;
  loading?: boolean;
}

const AgreementForm: React.FC<AgreementFormProps> = ({
  onSubmit,
  initialData,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<PaymentAgreement> | null>(
    initialData || null
  );

  useEffect(() => {
    if (initialData) {
      if (!initialData.total_amount)
        initialData.total_amount = Number(initialData.total_amount);

      if (!initialData.installments_count)
        initialData.installments_count = Number(initialData.installments_count);

      setFormData({
        ...initialData,
        installment_amount:
          initialData.total_amount / initialData.installments_count,
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
        <Box>
          {/* <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" gutterBottom>
              Aflostermijnen:
            </Typography>
            <Typography variant="h6" gutterBottom>
              {formData?.installments_count || 0}
            </Typography>
          </Box> */}
          <Box sx={{ width: "100%", px: 1 }}>
            <Slider
              name="installments_count"
              defaultValue={1}
              step={1}
              min={1}
              max={24}
              valueLabelDisplay="auto"
              value={formData?.installments_count || 0}
              onChange={(e, newValue) => {
                setFormData({
                  ...formData,

                  installment_amount: formData
                    ? Number(formData.total_amount) / Number(newValue)
                    : 0,

                  installments_count: Number(newValue),
                } as PaymentAgreementCreate);
              }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" gutterBottom>
              1 Maand
            </Typography>
            <Typography variant="caption" gutterBottom>
              24 Maanden
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: 1,
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Totaal te bedrag:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatCurrency(formData?.total_amount || 0)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aflostermijnen:
            </Typography>
            <Typography variant="body2">
              {formData?.installments_count ?? 0}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Startdatum:
            </Typography>
            <Typography variant="body2">
              {formatDate(formData?.start_date?.toString() || "")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Einddatum:
            </Typography>
            <Typography variant="body2">
              {formatDate(formData?.start_date?.toString() || "")}
            </Typography>
          </Box>

          <Box
            sx={{
              borderTop: 1,
              borderColor: "divider",
              pt: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Aflosbedrag:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatCurrency(
                formData?.total_amount && formData?.installments_count
                  ? formData.total_amount / formData.installments_count
                  : 0
              )}{" "}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          loading={loading}
        >
          Save
        </Button>
      </Box>
    </form>
  );
};
export default AgreementForm;
