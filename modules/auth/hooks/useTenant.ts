"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getTenantById } from "@/modules/tenant/actions/tenant.actions";
import { Tenant } from "@/modules/tenant/services/tenant.validators";

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchTenant() {
      setLoading(true);
      try {
        if (!session?.user?.tenant_id) {
          setTenant(null);
          setLoading(false);
          return;
        }

        const res = await getTenantById(session?.user?.tenant_id);

        if (!res?.tenant) {
          setTenant(null);
          return;
        }

        setTenant(res.tenant);
      } catch (err) {
        console.error("Error fetching tenant:", err);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.tenant_id?.trim()) {
      fetchTenant();
    }
  }, [status, session]);

  return {
    tenant,
    loading,
  };
}
