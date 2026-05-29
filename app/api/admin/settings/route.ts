import { SettingsService } from "@/services/settings.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 },
    );
  }

  const settings = await SettingsService.getByCategory(categoryId);

  return NextResponse.json({
    status: 200,
    data: settings,
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    await SettingsService.updateSettings(body);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Error updating settings",
      },
      {
        status: 500,
      },
    );
  }
}
