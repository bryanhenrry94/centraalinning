import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createEmployee } from "@/modules/employee/actions/employee.actions";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenant_id") as string;

    if (!file || !tenantId)
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let count = 0;
    for (const row of rows as any[]) {
      const data = {
        identification: row["Identiteitskaart"],
        first_name: row["Naam"],
        last_name: row["Achternaam"],
        email: row["Email"],
        address: row["Adres"],
        phone: row["Telefoon"],
        tenant_id: tenantId,
      };
      const res = await createEmployee(data, tenantId);
      if (res.success) count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error importing employees:", error);
    return NextResponse.json(
      { success: false, error: "Import failed" },
      { status: 500 }
    );
  }
}
