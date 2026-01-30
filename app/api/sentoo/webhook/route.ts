import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-sentoo-signature");

  if (signature !== process.env.SENTOO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();

  /*
    payload ejemplo:
    {
      "reference": "ST-123",
      "status": "paid" | "failed" | "expired",
      "amount": 2500,
      "currency": "USD"
    }
  */

  const { reference, status } = payload;

  // 🔒 Buscar pago en DB por reference
  // const payment = await db.payment.findUnique(...)

  switch (status) {
    case "paid":
      // marcar como pagado
      // await db.payment.update({ status: "paid" })
      break;

    case "failed":
    case "expired":
      // marcar como fallido
      break;
  }

  return NextResponse.json({ received: true });
}
