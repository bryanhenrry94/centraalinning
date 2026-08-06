"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

export default function NotFound() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          textAlign: "center",
          padding: "2rem",
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 4px 16px rgba(2,6,23,0.08)",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: 0 }}>
          404 — Pagina niet gevonden
        </h1>
        <p style={{ marginTop: "0.75rem", color: "#475569" }}>
          Het spijt ons, de pagina die u zoekt bestaat niet of is verplaatst.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Naar het dashboard"
            style={{
              padding: "6px 16px",
              backgroundColor: "#1976d2",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Naar het dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
