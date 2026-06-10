import { NextResponse } from "next/server";
import {
  getParameters,
  updateParameters,
} from "@/services/parameter/parameter.service";

export async function GET() {
  try {
    const data = await getParameters();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: "Error loading parameters" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const updated = await updateParameters(body);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating parameters" },
      { status: 500 }
    );
  }
}