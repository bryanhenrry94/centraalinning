import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContractService } from "@/modules/contract/services/contract.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.tenant_id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ContractService.startFollowUp(id);

    return new NextResponse(
      JSON.stringify({ message: "Vervolgupdate gestart" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Fout bij het starten van vervolgupdate";

    console.error("Error in start-follow-up route:", error);
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
