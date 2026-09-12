import { NextRequest, NextResponse } from "next/server";
import { requireStaffOrAssignedLawyerOrBailiffForTransfer } from "@/modules/legal-process/services/case-transfer-guards";
import {
  generateAanmaningPdfBuffer,
  generateSommatiePdfBuffer,
  generateIngebrekestellingPdfBuffer,
} from "@/modules/collection/services/collection-mail.service";
import { generateBlokkadePdfBuffer } from "@/modules/blockade/services/blockade-mail.service";

const LETTER_FILENAMES: Record<string, string> = {
  aanmaning: "Aanmaning.pdf",
  sommatie: "Sommatie.pdf",
  ingebrekestelling: "Ingebrekestelling.pdf",
  blokkade: "Blokkade.pdf",
};

// Genereert de AOP-brieven (Aanmaning/Sommatie/Ingebrekestelling/Blokkade)
// on-demand vanuit de huidige DebtClaim-gegevens — dezelfde builders als de
// e-mailverzending (collection-mail.service/blockade-mail.service), ze
// worden nergens opgeslagen. Toegang: dezelfde regel als de
// Documenten-sectie van dit dossier (staff van de organisatie, of de
// toegewezen advocaat/deurwaarder).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const { id, type } = await params;

  try {
    const { caseTransfer } = await requireStaffOrAssignedLawyerOrBailiffForTransfer(id);
    const debtClaimId = caseTransfer.debtClaim.id;

    let buffer: Buffer;

    switch (type) {
      case "aanmaning":
        buffer = await generateAanmaningPdfBuffer(debtClaimId);
        break;
      case "sommatie":
        buffer = await generateSommatiePdfBuffer(debtClaimId);
        break;
      case "ingebrekestelling":
        buffer = await generateIngebrekestellingPdfBuffer(debtClaimId);
        break;
      case "blokkade":
        buffer = await generateBlokkadePdfBuffer(debtClaimId);
        break;
      default:
        return NextResponse.json({ error: "Onbekend brieftype" }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${LETTER_FILENAMES[type]}"`,
      },
    });
  } catch (error) {
    console.error("Error generating AOP letter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon de brief niet genereren." },
      { status: 403 },
    );
  }
}
