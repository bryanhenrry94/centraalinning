import { NextRequest, NextResponse } from "next/server";
import { checkCaseTransferDeadlines } from "@/lib/jobs/check_case_transfer_deadlines";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (token !== process.env.CRON_SECRET_TOKEN) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await checkCaseTransferDeadlines();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
