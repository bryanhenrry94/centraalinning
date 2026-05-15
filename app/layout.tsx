import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppTheme from "@/theme/ThemeProvider";
import { ToastContainer } from "react-toastify";
import { SessionAuthProvider } from "@/providers/sessionAuthProvider";
import "@/lib/initServer"; // inicializa el scheduler
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "CFSB",
  description: "CFSB App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionAuthProvider>
          <AppTheme>{children}</AppTheme>
          <ToastContainer />
        </SessionAuthProvider>
      </body>
    </html>
  );
}
