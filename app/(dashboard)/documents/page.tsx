import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DocumentContent from "@/modules/dashboard/components/DocumentContent";
import { getDocuments } from "@/modules/dashboard/server/dashboard.service";
import { DocumentFilter } from "@/modules/dashboard/server/report.service";
import {
  getMyLegalProcessDocuments,
  getMyLegalProcessDocumentsAsBailiff,
} from "@/modules/legal-process/actions/legal-process.actions";
import { UserRole } from "@/shared/constants/user-role";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const filter: DocumentFilter = status === "completed" ? "completed" : "open";

  const session = await getServerSession(authOptions);
  const isLawyer = session?.user?.roles?.includes(UserRole.LAWYER);
  const isBailiff = session?.user?.roles?.includes(UserRole.BAILIFF);

  const documents = isLawyer
    ? await getMyLegalProcessDocuments()
    : isBailiff
      ? await getMyLegalProcessDocumentsAsBailiff()
      : await getDocuments(filter);

  return <DocumentContent documents={documents} filter={filter} />;
}
