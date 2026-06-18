import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";

import { DebtorService } from "@/services/debtor/debtor.service";
import { DebtorSearchParams } from "@/services/debtor/debtor.type";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;

    const q = searchParams.get("q") ?? "";

    const page = Number(searchParams.get("page") ?? "1");

    const pageSize = Number(searchParams.get("pageSize") ?? "10");

    const params: DebtorSearchParams = {
      q,
      page,
      pageSize,
    };

    const result = await DebtorService.searchPicker(
      session.user.tenant_id,
      params,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Error al consultar deudores",
      },
      {
        status: 500,
      },
    );
  }
}
