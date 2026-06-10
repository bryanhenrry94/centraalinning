"use client";

import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function TestPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    getSession().then((data) => {
      console.log("SESSION", data);
      setSession(data);
    });
  }, []);

  return <pre>{JSON.stringify(session, null, 2)}</pre>;
}
