import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  // 🔹 Crear tenant base (ejemplo)
  await prisma.tenant.upsert({
    where: { id: "0874303e-6795-46ef-8416-5d76bba8071b" },
    update: {},
    create: {
      id: "0874303e-6795-46ef-8416-5d76bba8071b",
      code: "CENTRAAL", // Código único para el tenant
      name: "Centraal Inning",
      legal_name: "Centraal Inning N.V.",
      kvk: "12345678",
      subdomain: "admin",
      contact_email: "info@centraalinning.com",
      country_code: "BQ", // Código de país de Bonaire
      address: "",
      city: "",
      logo_url: "",
      number_of_employees: 0,
      phone: "",
      website: "https://centraalinning.com",
      terms_accepted: true,
      is_active: true,
    },
  });

  await prisma.parameter.upsert({
    where: { id: "0874303e-6795-46ef-8416-5d76bba8071b" },
    update: {},
    create: {
      id: "0874303e-6795-46ef-8416-5d76bba8071b",
      collection_fee_rate: 15,
      abb_rate: 6,
      company_aanmaning_term_days: 5,
      consumer_aanmaning_term_days: 14,
      company_sommatie_term_days: 7,
      consumer_sommatie_term_days: 16,
      small_company_price: 100,
      small_company_pfc_contribution: 0,
      large_company_price: 200,
      large_company_pfc_contribution: 0,
      company_aanmaning_penalty: 0,
      natural_aanmaning_penalty: 0,
      company_sommatie_penalty: 0,
      natural_sommatie_penalty: 0,
      company_reaction_limit_days: 0,
      company_no_reaction_penalty: 0,
      natural_no_reaction_penalty: 0,
      company_payment_agreement_fee: 0,
      natural_payment_agreement_fee: 0,
      invoice_number_length: 8,
      invoice_prefix: "FACTUUR",
      invoice_sequence: 0,
      bank_account: "418.825.10",
      bank_name: "MCB",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const password_hash = await hash("demo1234", 10);

  await prisma.user.upsert({
    where: { id: "28112419-5c53-47c5-b109-a29d02c1bb5d" },
    update: {},
    create: {
      id: "28112419-5c53-47c5-b109-a29d02c1bb5d",
      email: "bryan.navarrete@dazzsoft.com",
      password_hash: password_hash,
      fullname: "Bryan Henrry",
      phone: "+59998765432",
      tenant_id: "0874303e-6795-46ef-8416-5d76bba8071b",
      role: "PLATFORM_OWNER",
      is_active: true,
    },
  });

  // 1. Interés legal para comerciales
  await prisma.interestType.upsert({
    where: { id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888" },
    update: {},
    create: {
      id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
      name: "Juridisch belang voor reclames",
      calculation_type: "VARIABLE",
    },
  });

  // 2. Interés legal para consumidores
  await prisma.interestType.upsert({
    where: { id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2" },
    update: {},
    create: {
      id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
      name: "Juridisch belang voor consumenten",
      calculation_type: "VARIABLE",
    },
  });

  // 3. Interés fijo
  await prisma.interestType.upsert({
    where: { id: "e2166b85-8a30-4e62-8dfb-304b585c7029" },
    update: {},
    create: {
      id: "e2166b85-8a30-4e62-8dfb-304b585c7029",
      name: "Vaste rente",
      calculation_type: "FIXED",
    },
  });

  // Limpiar detalles de interés existentes para evitar duplicados
  await prisma.interestDetail.deleteMany({
    where: {
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
  });

  await prisma.interestDetail.deleteMany({
    where: {
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
  });

  await prisma.interestDetail.deleteMany({
    where: {
      interest_type_id: "e2166b85-8a30-4e62-8dfb-304b585c7029",
    },
  });

  const interest_details = [
    {
      date: "01-07-2025",
      rate: 10.15,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2025",
      rate: 11.15,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2024",
      rate: 12.25,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2024",
      rate: 12.5,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2023",
      rate: 12.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2023",
      rate: 10.5,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2022",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2022",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2021",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2021",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2020",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2020",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2019",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2019",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2018",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2018",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2017",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2017",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2016",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2016",
      rate: 8.05,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2015",
      rate: 8.05,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2015",
      rate: 8.05,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2014",
      rate: 8.15,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2014",
      rate: 8.25,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2013",
      rate: 8.5,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "16-03-2013",
      rate: 8.75,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2013",
      rate: 7.75,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2012",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2012",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2011",
      rate: 8.25,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2011",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2010",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2010",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2009",
      rate: 8.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2009",
      rate: 9.5,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2008",
      rate: 11.07,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2008",
      rate: 11.2,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2007",
      rate: 11.07,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2007",
      rate: 10.58,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2006",
      rate: 9.83,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2006",
      rate: 9.25,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2005",
      rate: 9.05,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2005",
      rate: 9.09,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2004",
      rate: 9.01,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2004",
      rate: 9.02,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-07-2003",
      rate: 9.1,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2003",
      rate: 9.85,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-12-2002",
      rate: 10.35,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "08-08-2002",
      rate: 7.0,
      interest_type_id: "2dead16c-b00e-4546-8cd0-e08ffd1c4888",
    },
    {
      date: "01-01-2025",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2024",
      rate: 7,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-2023",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2023",
      rate: 4,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2015",
      rate: 2,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-2012",
      rate: 3,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-2011",
      rate: 4,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2010",
      rate: 3,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-2009",
      rate: 4,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2007",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-02-2004",
      rate: 4,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-08-2003",
      rate: 5,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2002",
      rate: 7,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2001",
      rate: 8,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-2000",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1999",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1998",
      rate: 6,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-1996",
      rate: 5,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1996",
      rate: 7,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1995",
      rate: 8,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1994",
      rate: 9,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-1993",
      rate: 10,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1992",
      rate: 12,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-07-1990",
      rate: 11,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1990",
      rate: 10,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-04-1987",
      rate: 8,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1983",
      rate: 9,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-04-1980",
      rate: 12,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1979",
      rate: 10,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-04-1976",
      rate: 8,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-05-1974",
      rate: 10,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-11-1972",
      rate: 8,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-03-1971",
      rate: 9,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
    {
      date: "01-01-1934",
      rate: 5,
      interest_type_id: "ad33a415-e6e8-4b1f-8639-13768d5f38d2",
    },
  ];

  for (const detail of interest_details) {
    await prisma.interestDetail.create({
      data: detail,
    });
  }

  console.log("✅ Seed ejecutado correctamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
