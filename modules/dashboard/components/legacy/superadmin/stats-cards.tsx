import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";

interface StatsCardsProps {
  totalCollection: number;
  totalDebtors: number;
  totalVerdicts: number;
  incomeMonth: number;
}

export function StatsCards({
  totalCollection,
  totalDebtors,
  totalVerdicts,
  incomeMonth,
}: StatsCardsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const stats = [
    {
      title: "Collections",
      value: totalCollection,
      icon: PeopleIcon,
      description: "Total de collections",
    },
    {
      title: "Debtors",
      value: totalDebtors,
      icon: InventoryIcon,
      description: "Total de deudores",
    },
    {
      title: "Verdicts",
      value: totalVerdicts,
      icon: AccessTimeFilledIcon,
      description: "Total de veredictos",
    },
    {
      title: "Income This Month",
      value: formatPrice(incomeMonth),
      icon: CurrencyExchangeIcon,
      description: "Facturas emitidas",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
