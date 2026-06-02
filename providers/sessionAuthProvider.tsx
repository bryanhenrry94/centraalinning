// providers/sessionAuthProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";

export function SessionAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log("SessionProvider mounted");
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
