import { SettingsCategoryService } from "@/services/settings-category.service";
import { NextResponse } from "next/server";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const category = await SettingsCategoryService.getById(id);

    if (!category) {
      return NextResponse.json(
        {
          message: "Category not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error loading category",
      },
      {
        status: 500,
      },
    );
  }
}
