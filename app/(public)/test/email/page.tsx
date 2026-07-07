import {
  AanmanningEmail,
  IngebrekestellingEmail,
  InvoiceEmail,
  SommatieEmail,
  WelcomeEmail,
} from "@/templates/emails";
import EconomischeBlokkadeEmail from "@/modules/blockade/templates/EconomischeBlokkadeEmail";
import NewClientEmail from "@/modules/tenant/templates/NewClientEmail";
import VerdictDebtorMail from "@/modules/verdict/templates/VerdictDebtorMail";
import VerdictRegisterEmail from "@/modules/verdict/templates/VerdictRegisterMail";
import { render } from "@react-email/render";

export default async function Page() {
  // const params = {
  //   logoUrl: "/static/logo.png",
  //   fullname: "Bryan Navarrete",
  //   appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com",
  // };
  // const html = await render(<WelcomeEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   fullname: "Bryan Navarrete",
  // };
  // const html = await render(<AanmanningEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   fullname: "Bryan Navarrete",
  // };
  // const html = await render(<SommatieEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   fullname: "Bryan Navarrete",
  // };
  // const html = await render(<IngebrekestellingEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   fullname: "Bryan Navarrete",
  // };
  // const html = await render(<InvoiceEmail {...params} />);

  const params = {
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
    fullname: "Bryan Navarrete",
    creditorName: "Dazzsoft",
  };
  const html = await render(<EconomischeBlokkadeEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   link: process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com",
  //   datumVonnis: "01-01-2024",
  //   vonnisNummer: "1234567890",
  // };
  // const html = await render(<VerdictDebtorMail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   verdictReference: "1234567890",
  //   verdictDate: "01-01-2024",
  // };
  // const html = await render(<VerdictRegisterEmail {...params} />);

  // const params = {
  //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/static/logo.png",
  //   clientName: "Empresa Ejemplo S.A.",
  //   registeredAt: "2024-06-15",
  //   totalClients: 150,
  // };
  // const html = await render(<NewClientEmail {...params} />);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
