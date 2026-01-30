import { redirect } from "next/navigation";

export default function ReturnPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  if (!searchParams.ref) {
    redirect("/payment/failed");
  }

  // Mostrar "Procesando pago..."
  return <p>Procesando tu pago, por favor espera…</p>;
}
