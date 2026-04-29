export async function sentooRequest(endpoint: string, body: URLSearchParams) {
  const res = await fetch(`${process.env.SENTOO_API}${endpoint}`, {
    method: "POST",
    headers: {
      "X-SENTOO-SECRET": process.env.SENTOO_SECRET!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await res.json();

  console.log("data: ");
  console.log(data);

  // ❌ Errores técnicos reales
  if (!res.ok && res.status !== 402) {
    console.error("Sentoo technical error:", data);
    throw new Error(data?.error?.message || "Sentoo request failed");
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

export async function getPaymentStatus(endpoint: string) {
  const res = await fetch(`${process.env.SENTOO_API}${endpoint}`, {
    method: "GET",
    headers: {
      "X-SENTOO-SECRET": process.env.SENTOO_SECRET!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });

  const data = await res.json();

  // ❌ Errores técnicos reales
  if (!res.ok && res.status !== 402) {
    console.error("Sentoo technical error:", data);
    throw new Error(data?.error?.message || "Sentoo request failed");
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}
