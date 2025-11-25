"use client";
import { useEffect, useState } from "react";
import { Box, Typography, Alert } from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { PaymentCXForm } from "@/components/financial-report/payment-form";

type Item = {
  id: number;
  name: string;
  description: string;
  price: number;
};

interface PaymentCardProps {
  items: Item[];
  onSuccess: () => void;
  loading: boolean;
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  items,
  onSuccess,
  loading,
}) => {
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [amount, setAmount] = useState(0);

  const handlePaymentSuccess = () => {
    setOrderCompleted(true);
    onSuccess();
  };

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    setAmount(total);
  }, [items]);

  return (
    <Box sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 4,
        }}
      >
        <Box
          sx={{
            minWidth: 350,
            maxWidth: 400,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 4,
            }}
          >
            <ShoppingCart color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Tu Orden
            </Typography>
          </Box>
          {items.map((item) => (
            <Box key={item.id} sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {item.name}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  ${item.price.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {item.description}
              </Typography>
            </Box>
          ))}
          <Typography
            variant="h6"
            fontWeight="bold"
            textAlign={"right"}
            sx={{ mt: 2, borderTop: "1px solid #e0e3e7", pt: 1 }}
          >
            Total: $
            {items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
          </Typography>

          {orderCompleted && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ¡Pago realizado y orden completada exitosamente!
            </Alert>
          )}
        </Box>
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 4,
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Información de Pago
            </Typography>
            {/* <Chip label="Seguro" color="success" /> */}
          </Box>

          <PaymentCXForm
            amount={amount}
            onSuccess={handlePaymentSuccess}
            disabled={orderCompleted}
            loading={loading}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PaymentCard;
