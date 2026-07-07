"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { protocol, rootDomain } from "@/lib/config";
import LoadingUI from "@/shared/ui/loading-ui";

export default function LogoutPage() {
  useEffect(() => {
    signOut({
      callbackUrl: `${protocol}://auth.${rootDomain}/login`,
    });
  }, []);

  return <LoadingUI />;
}
