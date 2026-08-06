import { NextRequest, NextResponse } from "next/server";
import { processAopWorkflow } from "@/lib/jobs/process_aop_workflow";
import { checkBlockadeReactivation } from "@/lib/jobs/check_blockade_reactivation";
import { checkGopDeadlines } from "@/lib/jobs/check_gop_deadlines";
import { checkCaseTransferDeadlines } from "@/lib/jobs/check_case_transfer_deadlines";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (token !== process.env.CRON_SECRET_TOKEN) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const notifResult = await processAopWorkflow();
    const blockadeResult = await checkBlockadeReactivation();
    const gopDeadlinesResult = await checkGopDeadlines();
    const caseTransferDeadlinesResult = await checkCaseTransferDeadlines();

    return NextResponse.json({
      success: true,
      message: "Todos los procesos ejecutados correctamente",
      stats: {
        notified: notifResult.sent,
        blockadesReactivated: blockadeResult.reactivated,
        gopPrescriptionReminders: gopDeadlinesResult.prescriptionReminders,
        gopReviewReminders: gopDeadlinesResult.reviewReminders,
        caseTransferAcceptanceReminders: caseTransferDeadlinesResult.reminders,
        caseTransferDeadlineNotices: caseTransferDeadlinesResult.deadlineNotices,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
