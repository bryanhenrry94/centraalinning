import { NextResponse } from "next/server";

import { SettingsCategoryService } from "@/services/settings-category.service";

export async function GET() {
  try {
    const categories = await SettingsCategoryService.getAll();

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
