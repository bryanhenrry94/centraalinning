import { NextResponse } from "next/server";

import { SettingsCategoryService } from "@/modules/settings/services/settings/settings-category.service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jurisdictionId = url.searchParams.get("jurisdictionId");
    const categories = await SettingsCategoryService.getAll(jurisdictionId);

    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Error loading setting categories",
      },
      {
        status: 500,
      },
    );
  }
}
