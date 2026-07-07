"use client";

import Link from "next/link";

import { Breadcrumbs, Box, Typography } from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    ...items,
  ];

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        const content = (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {index === 0 && (
              <DashboardIcon
                sx={{
                  fontSize: 18,
                }}
              />
            )}

            <Typography variant="body2" component="span">
              {item.label}
            </Typography>
          </Box>
        );

        if (isLast || !item.href) {
          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 500,
              }}
            >
              {content}
            </Box>
          );
        }

        return (
          <Link
            key={index}
            href={item.href}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {content}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
