// app/api/test-upload/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/infrastructure/storage/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin.storage
    .from("cfsb-storage")
    .list();

  return NextResponse.json({
    data,
    error,
  });
}