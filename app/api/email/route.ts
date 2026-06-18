import React from "react";
import { NextResponse } from "next/server";
import { render } from "@react-email/components";
import { resend } from "@/lib/email";
import NewClientEmail, {
  NewClientEmailProps,
} from "@/templates/emails/NewClientEmail";
import EconomischeBlokkadeEmail, {
  EconomischeBlokkadeEmailProps,
} from "@/templates/emails/EconomischeBlokkadeEmail";

export async function GET(req: Request) {
  try {
    // const params: NewClientEmailProps = {
    //   logoUrl: "https://yfrqdghdjziwswilefwx.supabase.co/storage/v1/object/public/portalci/LogoCIOvs2.png",
    //   clientName: "DAZZSOFT S.A.",
    //   registeredAt: new Date().toLocaleDateString(),
    //   totalClients: 150,
    // };

    // // const html = await render(<TestEmail name={name} />);
    // const html = await render(React.createElement(NewClientEmail, params));

    const params: EconomischeBlokkadeEmailProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
      fullname: "Bryan Navarrete",
      creditorName: "DAZZSOFT S.A.",
    };

    const html = await render(
      React.createElement(EconomischeBlokkadeEmail, params),
    );

    const data = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: ["wsambo38@gmail.com", "bryanhenrry94@gmail.com"],
      subject: "CFSB - Blokkade",
      html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
