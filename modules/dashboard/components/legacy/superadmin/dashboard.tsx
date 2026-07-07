"use client";
import React, { useEffect } from "react";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import LoadingUI from "@/shared/ui/loading-ui";
import { StatsCards } from "@/modules/dashboard/components/legacy/superadmin/stats-cards";
import { Box, Container } from "@mui/material";
import { RecentInvoices } from "@/modules/dashboard/components/legacy/superadmin/recent-invoices";
import { getDashboardStats } from "@/modules/dashboard/actions/dashboard.actions";

const DashboardSuperAdmin = () => {
  const { isAuthenticated, isLoading, user } = useAuthSession();
  const [totalVerdicts, setTotalVerdicts] = React.useState(0);
  const [totalDebtors, setTotalDebtors] = React.useState(0);
  const [totalCollection, setTotalCollection] = React.useState(0);
  const [incomeMonth, setIncomeMonth] = React.useState(0);
  const [facturasRecientes, setFacturasRecientes] = React.useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const result = await getDashboardStats();

    if (!result.success) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">Error al cargar el dashboard</p>
        </div>
      );
    }

    if (!result.data) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-slate-500">
            No hay datos disponibles para el dashboard
          </p>
        </div>
      );
    }

    const {
      totalVerdicts,
      totalDebtors,
      totalCollection,
      incomeMonth,
      facturasRecientes,
    } = result.data;

    setTotalVerdicts(totalVerdicts);
    setTotalDebtors(totalDebtors);
    setTotalCollection(totalCollection);
    setIncomeMonth(incomeMonth);
    setFacturasRecientes(facturasRecientes);
  };

  if (isLoading) {
    return <LoadingUI />;
  }

  if (!isAuthenticated) return <>No autorizado. Por favor, inicie sesión.</>;

  return (
    <>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <StatsCards
            totalCollection={totalCollection}
            totalDebtors={totalDebtors}
            totalVerdicts={totalVerdicts}
            incomeMonth={incomeMonth}
          />

          <RecentInvoices
            facturas={
              facturasRecientes as unknown as import("@/modules/payment/services/billing-invoice.validators").BillingInvoiceWithTenant[]
            }
          />
        </Box>
      </Container>
    </>
  );
};

export default DashboardSuperAdmin;
