import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import Link from "next/link";
import { BillingInvoiceWithTenant } from "@/lib/validations/billing-invoice";

interface RecentInvoicesProps {
  facturas: BillingInvoiceWithTenant[];
}

export function RecentInvoices({ facturas }: RecentInvoicesProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-EC", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      BORRADOR: "secondary",
      EMITIDA: "default",
      AUTORIZADA: "default",
      ANULADA: "destructive",
    };

    return (
      <Badge variant={variants[estado] || "outline"} className="text-xs">
        {estado}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {facturas.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            No hay facturas registradas
          </p>
        ) : (
          <div className="space-y-4">
            {facturas.map((factura) => (
              <Link
                key={factura.id}
                href={`/dashboard/facturas/${factura.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">
                      #{factura.invoice_number}
                    </p>
                    {getEstadoBadge(factura.status)}
                  </div>
                  <p className="text-sm text-slate-600">
                    {factura.tenant.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">
                    {formatPrice(factura.amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(factura.issue_date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
