"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, TextField, Grid } from "@mui/material";

declare global {
  interface Window {
    CollectCheckout?: any;
  }
}

interface PaymentFormProps {
  amount: number;
  onSuccess: () => void;
  disabled: boolean;
  loading: boolean;
}

export const PaymentCXForm = ({
  amount,
  onSuccess,
  disabled,
  loading,
}: PaymentFormProps) => {
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cxpay.transactiongateway.com/token/CollectCheckout.js";
    script.async = true;
    script.dataset.checkoutKey =
      "checkout_public_Q5R6CGK2D8f7aQ2578rA7694qagKbmyp"; // 🔑 tu clave pública real
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    onSuccess();

    // if (window.CollectCheckout) {
    //   window.CollectCheckout.process(
    //     {
    //       amount,
    //       currency: "USD",
    //       first_name: fname,
    //       last_name: lname,
    //     },
    //     (response: any) => {
    //       console.log("Respuesta del gateway:", response);
    //       if (response.success) {
    //         alert("Pago realizado con éxito 🚀");
    //         onSuccess();
    //       } else {
    //         alert("Error en el pago ❌");
    //       }
    //     }
    //   );
    // } else {
    //   console.error("CollectCheckout no está cargado.");
    // }
  };

  return (
    <Box component="form" onSubmit={handlePayment} sx={{ mt: 2 }}>
      {/* Datos del cliente */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Nombre"
            variant="outlined"
            value={fname}
            onChange={(e) => setFname(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Apellido"
            variant="outlined"
            value={lname}
            onChange={(e) => setLname(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 12 }}>
          <TextField
            fullWidth
            label="Número de tarjeta"
            variant="outlined"
            inputProps={{ "data-checkout": "card_number" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 12 }}>
          <TextField
            fullWidth
            label="Fecha de expiración (MM/AA)"
            variant="outlined"
            inputProps={{ "data-checkout": "exp_date" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 12 }}>
          <TextField
            fullWidth
            label="CVV"
            variant="outlined"
            inputProps={{ "data-checkout": "cvv" }}
          />
        </Grid>
      </Grid>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2, textTransform: "none" }}
        disabled={disabled || loading}
        loading={loading}
      >
        Pagar
      </Button>
      <Typography
        variant="caption"
        color="textSecondary"
        display="block"
        textAlign="center"
        sx={{ mt: 1 }}
      >
        Pago Seguro con CX Pay
      </Typography>
    </Box>
  );
};
