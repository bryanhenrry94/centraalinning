import React from "react";
import { NextResponse } from "next/server";
import { TestEmail } from "@/templates/emails/TestEmail";
import { sendInvoiceEmail } from "@/actions/email";
import { render } from "@react-email/components";
import { resend } from "@/lib/email";

export async function GET() {
  const result = await sendInvoiceEmail(
    "bryanhenrry94@gmail.com",
    "c1f459d9-a2d6-4254-a8eb-a98c53b02f13",
  );

  return NextResponse.json({ message: "Send Email API is running", result });
}

export async function POST(req: Request) {
  try {
    const { to, name } = await req.json();

    if (!to || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // const html = await render(<TestEmail name={name} />);
    const html = await render(React.createElement(TestEmail, { name }));

    const data = await resend.emails.send({
      from: `PortalCI <${process.env.MAIL_FROM || "no-reply@centraalinning.com"}>`, // Debe ser un dominio verificado en Resend
      to,
      subject: "Correo de prueba desde Next.js",
      html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
