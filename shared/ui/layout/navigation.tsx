"use client";

import React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import { UserRole } from "@/shared/constants/user-role";

type MenuItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  role?: string[];
};

const menus: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <DashboardOutlinedIcon fontSize="small" />,
    role: [UserRole.PLATFORM_OWNER, UserRole.DEBTOR, UserRole.BAILIFF],
  },
  {
    label: "Diensten",
    href: "/client",
    icon: <DashboardOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Blok-Check",
    href: "/client/blok-checks",
    icon: <ShieldOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Financiële afspraak registreren",
    href: "/client/overeenkomsten-registreren",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Administratieve opvolging",
    href: "/client/collections",
    icon: <ReceiptOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Blokkade",
    href: "/client/directe-economische-blokkade",
    icon: <ShieldOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Gerechtelijke opvolging",
    href: "/client/verdicts",
    icon: <GavelOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Gerechtelijk Vonnis",
    href: "/dashboard/verdicts",
    icon: <GavelOutlinedIcon fontSize="small" />,
    role: [UserRole.BAILIFF],
  },
  {
    label: "Betalingsregeling",
    href: "/client/agreements",
    icon: <HandshakeOutlinedIcon fontSize="small" />,
    role: [UserRole.TENANT_ADMIN],
  },
  {
    label: "Invoices",
    href: "/dashboard/invoices",
    icon: <ReceiptOutlinedIcon fontSize="small" />,
    role: [UserRole.PLATFORM_OWNER],
  },
  {
    label: "Parameters",
    href: "/admin/settings/parameters",
    icon: <ReceiptOutlinedIcon fontSize="small" />,
    role: [UserRole.PLATFORM_OWNER],
  },
];

const Navigation = ({ role }: { role: string }) => {
  const pathname = usePathname();
  const theme = useTheme();

  const items = menus.filter((item) => item.role?.includes(role));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
        px: {
          xs: 1,
          md: 4,
        },
      }}
    >
      <Stack
        direction="row"
        spacing={{
          xs: 1,
          md: 2,
        }}
        sx={{
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          minHeight: 72,
          alignItems: "center",
        }}
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Box
              key={item.label}
              component={NextLink}
              href={item.href}
              sx={{
                position: "relative",
                minWidth: "fit-content",
                textDecoration: "none",
                px: 2,
                py: 2,
                borderRadius: 2,
                transition: "all .2s ease",
                color: active ? theme.palette.secondary.main : "text.secondary",

                "&:hover": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.05),
                  color: theme.palette.secondary.main,
                },

                "&::after": active
                  ? {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      width: "100%",
                      height: "3px",
                      borderRadius: "999px",
                      backgroundColor: theme.palette.secondary.main,
                    }
                  : {},
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": {
                      fontSize: 20,
                    },
                  }}
                >
                  {item.icon}
                </Box>

                <Typography
                  sx={{
                    fontSize: "0.95rem",
                    fontWeight: active ? 700 : 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default Navigation;
