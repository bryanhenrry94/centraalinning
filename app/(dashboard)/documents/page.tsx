import DocumentContent from "@/modules/dashboard/components/DocumentContent";
import { getDocuments } from "@/modules/dashboard/server/dashboard.service";
import { DocumentFilter } from "@/modules/dashboard/server/report.service";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const filter: DocumentFilter = status === "completed" ? "completed" : "open";

  const documents = await getDocuments(filter);

  return <DocumentContent documents={documents} filter={filter} />;
}
