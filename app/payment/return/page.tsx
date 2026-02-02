"use client";
import React from "react";
import { useSearchParams } from "next/navigation";

export default function ReturnPage() {
  const status = useSearchParams().get("status");

  let icon = "⏳";
  let message = "Tu pago aún se está procesando";
  let color = "#fbbf24"; // amber

  if (status === "success") {
    icon = "✅";
    message = "Pago confirmado";
    color = "#22c55e"; // green
  } else if (status === "failed") {
    icon = "❌";
    message = "Pago fallido";
    color = "#ef4444"; // red
  } else if (status === "pending") {
    icon = "⏳";
    message = "Pago pendiente de confirmación";
    color = "#fbbf24"; // amber
  } else if (status === "cancelled") {
    icon = "❌";
    message = "Pago cancelado por el usuario";
    color = "#ef4444"; // red
  } else if (status === "expired") {
    icon = "❌";
    message = "Pago expirado";
    color = "#ef4444"; // red
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "40px auto",
        padding: 32,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center",
        border: `2px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ color, marginBottom: 8 }}>{message}</h2>
      <p style={{ color: "#64748b" }}>
        Puedes cerrar esta ventana o regresar a la aplicación.
      </p>
    </div>
  );
}
