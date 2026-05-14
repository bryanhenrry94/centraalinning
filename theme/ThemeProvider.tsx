"use client";

import * as React from "react";
import { ThemeProvider, alpha, createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";
import { brand, secondary, blue, orange, red, green, gray } from "./colors";

interface AppThemeProps {
  children: React.ReactNode;
  /**
   * This is for the docs site. You can ignore it or remove it.
   */
  disableCustomTheme?: boolean;
  themeComponents?: ThemeOptions["components"];
}

const defaultTheme = createTheme();

export default function AppTheme(props: AppThemeProps) {
  const { children, themeComponents } = props;
  const theme = React.useMemo(() => {
    // Always use light mode regardless of system/browser preference
    return createTheme({
      palette: {
        mode: "light",
        primary: {
          light: brand[200],
          main: brand[400],
          dark: brand[700],
          contrastText: brand[50],
        },
        secondary: {
          light: secondary[200],
          main: secondary[700],
          dark: secondary[900],
          contrastText: secondary[200],
        },
        info: {
          contrastText: blue[100],
          light: blue[500],
          main: blue[700],
          dark: blue[900],
        },
        warning: {
          contrastText: orange[900],
          light: orange[300],
          main: orange[400],
          dark: orange[500],
        },
        error: {
          contrastText: gray[50],
          light: red[300],
          main: red[400],
          dark: red[500],
        },
        success: {
          contrastText: gray[50],
          light: green[300],
          main: green[400],
          dark: green[800],
        },
        grey: {
          ...gray,
        },
        // divider: alpha(gray[300], 1),
        background: {
          default: "hsl(0, 0%, 99%)",
          paper: "hsl(220, 35%, 97%)",
        },
        text: {
          primary: gray[800],
          secondary: gray[600],
        },
        action: {
          hover: alpha(gray[200], 0.2),
          selected: `${alpha(gray[200], 0.3)}`,
        },
      },

      typography: {
        fontFamily: "Inter, sans-serif",
        h1: {
          fontSize: defaultTheme.typography.pxToRem(48),
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: -0.5,
        },
        h2: {
          fontSize: defaultTheme.typography.pxToRem(36),
          fontWeight: 600,
          lineHeight: 1.2,
        },
        h3: {
          fontSize: defaultTheme.typography.pxToRem(30),
          lineHeight: 1.2,
        },
        h4: {
          fontSize: defaultTheme.typography.pxToRem(24),
          fontWeight: 600,
          lineHeight: 1.5,
        },
        h5: {
          fontSize: defaultTheme.typography.pxToRem(20),
          fontWeight: 600,
        },
        h6: {
          fontSize: defaultTheme.typography.pxToRem(18),
          fontWeight: 600,
        },
        subtitle1: {
          fontSize: defaultTheme.typography.pxToRem(18),
        },
        subtitle2: {
          fontSize: defaultTheme.typography.pxToRem(14),
          fontWeight: 500,
        },
        body1: {
          fontSize: defaultTheme.typography.pxToRem(14),
        },
        body2: {
          fontSize: defaultTheme.typography.pxToRem(14),
          fontWeight: 400,
        },
        caption: {
          fontSize: defaultTheme.typography.pxToRem(12),
          fontWeight: 400,
        },
      },
      shape: {
        borderRadius: 8,
      },
      ...(themeComponents ? { components: themeComponents } : {}),
    });
  }, [themeComponents]);

  return (
    <ThemeProvider theme={theme} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
