import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// IDs fijos para poder referenciarlos entre sí y desde el .env
const ADMIN_TENANT_ID = "0874303e-6795-46ef-8416-5d76bba8071b";
const ADMIN_USER_EMAIL = "bryanhenrry94@gmail.com";
const PLAN_DEELNEMER_ID = "plan-klant-001";
const PLAN_ADVOCAAT_ID = "plan-advocaat-001";
const PLAN_DEURWAARDER_ID = "plan-deurwaarder-001";

// Orden de implementación acordado: Bonaire (activa) → Curaçao → Aruba
// (preparadas, isActive=false). Los nombres de isla viven acá como datos,
// nunca como enum en el código fuente (punto 13 del análisis CFSB).
const JURISDICTIONS = [
  {
    id: "jurisdiction-bon-001",
    islandCode: "BON",
    islandName: "Bonaire",
    jurisdictionName: "Openbaar Lichaam Bonaire",
    countryCode: "BON",
    timezone: "America/Kralendijk",
    numberingPrefix: "BON",
    isActive: true,
    rolloutOrder: 1,
    currencyCode: "USD",
    services: ["FAR", "AOP", "BLC", "BLK", "COP", "GOP"] as const,
  },
  {
    id: "jurisdiction-cur-001",
    islandCode: "CUR",
    islandName: "Curaçao",
    jurisdictionName: "Land Curaçao",
    countryCode: "CW",
    timezone: "America/Curacao",
    numberingPrefix: "CUR",
    isActive: false,
    rolloutOrder: 2,
    currencyCode: "USD",
    services: [] as const,
  },
  {
    id: "jurisdiction-aru-001",
    islandCode: "ARU",
    islandName: "Aruba",
    jurisdictionName: "Land Aruba",
    countryCode: "AW",
    timezone: "America/Aruba",
    numberingPrefix: "ARU",
    isActive: false,
    rolloutOrder: 3,
    currencyCode: "USD",
    services: [] as const,
  },
];

// Valores de negocio (tarifas/plazos/datos bancarios) por isla — ya no
// viven en `Jurisdiction` (que solo guarda datos de la isla), sino
// directamente como `Setting` con jurisdictionId (ver seedJurisdictionSettings).
// Bonaire es la única isla operativa hoy; Curaçao/Aruba quedan con los
// mismos valores como placeholder hasta que CFSB confirme sus tarifas.
const JURISDICTION_PARAMETERS: Record<
  string,
  {
    collectionFeeRate: number;
    collectionFeeMinimumAmount: number;
    abbRate: number;
    companyAanmaningTermDays: number;
    consumerAanmaningTermDays: number;
    companySommatieTermDays: number;
    consumerSommatieTermDays: number;
    companyAanmaningPenalty: number;
    naturalAanmaningPenalty: number;
    companySommatiePenalty: number;
    naturalSommatiePenalty: number;
    companyReactionLimitDays: number;
    companyNoReactionPenalty: number;
    naturalNoReactionPenalty: number;
    companyPaymentAgreementFee: number;
    naturalPaymentAgreementFee: number;
    blokCheckPricing: number;
    blockadeRegistrationPricing: number;
    farRegistrationFee: number;
    digitalFileCosts: number;
    extraAdministrativeCosts: number;
    reportFinancialPricing: number;
    bankName: string;
    bankAccount: string;
  }
> = {
  "jurisdiction-bon-001": {
    collectionFeeRate: 15,
    collectionFeeMinimumAmount: 40,
    abbRate: 6,
    companyAanmaningTermDays: 5,
    consumerAanmaningTermDays: 14,
    companySommatieTermDays: 7,
    consumerSommatieTermDays: 14,
    companyAanmaningPenalty: 25,
    naturalAanmaningPenalty: 15,
    companySommatiePenalty: 50,
    naturalSommatiePenalty: 25,
    companyReactionLimitDays: 5,
    companyNoReactionPenalty: 100,
    naturalNoReactionPenalty: 50,
    companyPaymentAgreementFee: 50,
    naturalPaymentAgreementFee: 25,
    blokCheckPricing: 35,
    blockadeRegistrationPricing: 35,
    farRegistrationFee: 10,
    digitalFileCosts: 10,
    extraAdministrativeCosts: 0,
    reportFinancialPricing: 35,
    bankName: "MCB (Maduro & Curiel's Bank)",
    bankAccount: "123456789",
  },
  "jurisdiction-cur-001": {
    collectionFeeRate: 15,
    collectionFeeMinimumAmount: 40,
    abbRate: 6,
    companyAanmaningTermDays: 5,
    consumerAanmaningTermDays: 14,
    companySommatieTermDays: 7,
    consumerSommatieTermDays: 14,
    companyAanmaningPenalty: 25,
    naturalAanmaningPenalty: 15,
    companySommatiePenalty: 50,
    naturalSommatiePenalty: 25,
    companyReactionLimitDays: 5,
    companyNoReactionPenalty: 100,
    naturalNoReactionPenalty: 50,
    companyPaymentAgreementFee: 50,
    naturalPaymentAgreementFee: 25,
    blokCheckPricing: 35,
    blockadeRegistrationPricing: 35,
    farRegistrationFee: 10,
    digitalFileCosts: 10,
    extraAdministrativeCosts: 0,
    reportFinancialPricing: 35,
    bankName: "",
    bankAccount: "",
  },
  "jurisdiction-aru-001": {
    collectionFeeRate: 15,
    collectionFeeMinimumAmount: 40,
    abbRate: 6,
    companyAanmaningTermDays: 5,
    consumerAanmaningTermDays: 14,
    companySommatieTermDays: 7,
    consumerSommatieTermDays: 14,
    companyAanmaningPenalty: 25,
    naturalAanmaningPenalty: 15,
    companySommatiePenalty: 50,
    naturalSommatiePenalty: 25,
    companyReactionLimitDays: 5,
    companyNoReactionPenalty: 100,
    naturalNoReactionPenalty: 50,
    companyPaymentAgreementFee: 50,
    naturalPaymentAgreementFee: 25,
    blokCheckPricing: 35,
    blockadeRegistrationPricing: 35,
    farRegistrationFee: 10,
    digitalFileCosts: 10,
    extraAdministrativeCosts: 0,
    reportFinancialPricing: 35,
    bankName: "",
    bankAccount: "",
  },
};

async function seedJurisdictions() {
  for (const { services, ...jurisdiction } of JURISDICTIONS) {
    await prisma.jurisdiction.upsert({
      where: { id: jurisdiction.id },
      update: {},
      create: jurisdiction,
    });

    for (const service of services) {
      await prisma.jurisdictionService.upsert({
        where: {
          jurisdictionId_service: { jurisdictionId: jurisdiction.id, service },
        },
        update: {},
        create: { jurisdictionId: jurisdiction.id, service, isActive: true },
      });
    }
  }

  console.log(
    "✓ Jurisdictions seeded (Bonaire activa; Curaçao/Aruba preparadas)",
  );
}

// Categorías nuevas para la configuración por isla (punto 14 del análisis
// CFSB — reemplaza al singleton global Parameter). "Notificaties" reusa la
// categoría general ya sembrada; acá solo se agregan las filas
// específicas por jurisdicción bajo esa categoría existente.
const JURISDICTION_SETTING_CATEGORIES = [
  {
    id: "cat-rates",
    key: "rates",
    name: "Tarieven",
    description: "Tarieven per eiland",
    icon: "payments",
    sortOrder: 10,
  },
  {
    id: "cat-deadlines",
    key: "deadlines",
    name: "Termijnen",
    description: "Termijnen per eiland",
    icon: "schedule",
    sortOrder: 11,
  },
  {
    id: "cat-abb",
    key: "abb",
    name: "ABB",
    description: "ABB-tarief per eiland",
    icon: "percent",
    sortOrder: 12,
  },
  {
    id: "cat-percentages",
    key: "percentages",
    name: "Percentages",
    description: "Percentages en boetes per eiland",
    icon: "percent",
    sortOrder: 13,
  },
  {
    id: "cat-reminder-frequency",
    key: "reminder_frequency",
    name: "Herinneringsfrequentie",
    description: "Wanneer automatische herinneringen verzonden worden",
    icon: "alarm",
    sortOrder: 14,
  },
];

async function seedJurisdictionSettings() {
  for (const cat of JURISDICTION_SETTING_CATEGORIES) {
    await prisma.settingCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: cat,
    });
  }

  for (const jurisdiction of JURISDICTIONS) {
    const params = JURISDICTION_PARAMETERS[jurisdiction.id];

    const rows: {
      key: string;
      name: string;
      categoryId: string;
      value: string;
    }[] = [
      // Tarieven
      {
        key: "collection_fee_minimum_amount",
        name: "Minimum incassokosten",
        categoryId: "cat-rates",
        value: String(params.collectionFeeMinimumAmount),
      },
      {
        key: "blok_check_pricing",
        name: "Blok-Check prijs",
        categoryId: "cat-rates",
        value: String(params.blokCheckPricing),
      },
      {
        key: "report_financial_pricing",
        name: "Financieel verslag prijs",
        categoryId: "cat-rates",
        value: String(params.reportFinancialPricing),
      },
      {
        key: "blockade_registration_pricing",
        name: "Blokkade (BLK) registratieprijs",
        categoryId: "cat-rates",
        value: String(params.blockadeRegistrationPricing),
      },
      {
        key: "far_registration_fee",
        name: "FAR-registratiekosten",
        categoryId: "cat-rates",
        value: String(params.farRegistrationFee),
      },
      {
        key: "digital_file_costs",
        name: "Digitaal dossierkosten",
        categoryId: "cat-rates",
        value: String(params.digitalFileCosts),
      },
      {
        key: "extra_administrative_costs",
        name: "Extra administratiekosten",
        categoryId: "cat-rates",
        value: String(params.extraAdministrativeCosts),
      },
      {
        key: "company_payment_agreement_fee",
        name: "Betalingsregeling fee (bedrijf)",
        categoryId: "cat-rates",
        value: String(params.companyPaymentAgreementFee),
      },
      {
        key: "natural_payment_agreement_fee",
        name: "Betalingsregeling fee (particulier)",
        categoryId: "cat-rates",
        value: String(params.naturalPaymentAgreementFee),
      },
      {
        key: "bank_name",
        name: "Bank",
        categoryId: "cat-billing",
        value: params.bankName,
      },
      {
        key: "bank_account",
        name: "Bankrekeningnummer",
        categoryId: "cat-billing",
        value: params.bankAccount,
      },
      // Termijnen
      {
        key: "company_aanmaning_term_days",
        name: "Aanmaningstermijn (bedrijf)",
        categoryId: "cat-deadlines",
        value: String(params.companyAanmaningTermDays),
      },
      {
        key: "consumer_aanmaning_term_days",
        name: "Aanmaningstermijn (particulier)",
        categoryId: "cat-deadlines",
        value: String(params.consumerAanmaningTermDays),
      },
      {
        key: "company_sommatie_term_days",
        name: "Sommatietermijn (bedrijf)",
        categoryId: "cat-deadlines",
        value: String(params.companySommatieTermDays),
      },
      {
        key: "consumer_sommatie_term_days",
        name: "Sommatietermijn (particulier)",
        categoryId: "cat-deadlines",
        value: String(params.consumerSommatieTermDays),
      },
      {
        key: "company_reaction_limit_days",
        name: "Reactietermijn (bedrijf)",
        categoryId: "cat-deadlines",
        value: String(params.companyReactionLimitDays),
      },
      // ABB
      {
        key: "abb_rate",
        name: "ABB-tarief",
        categoryId: "cat-abb",
        value: String(params.abbRate),
      },
      // Percentages
      {
        key: "collection_fee_rate",
        name: "Incassotarief (%)",
        categoryId: "cat-percentages",
        value: String(params.collectionFeeRate),
      },
      {
        key: "company_aanmaning_penalty",
        name: "Aanmaningsboete (bedrijf)",
        categoryId: "cat-percentages",
        value: String(params.companyAanmaningPenalty),
      },
      {
        key: "natural_aanmaning_penalty",
        name: "Aanmaningsboete (particulier)",
        categoryId: "cat-percentages",
        value: String(params.naturalAanmaningPenalty),
      },
      {
        key: "company_sommatie_penalty",
        name: "Sommatieboete (bedrijf)",
        categoryId: "cat-percentages",
        value: String(params.companySommatiePenalty),
      },
      {
        key: "natural_sommatie_penalty",
        name: "Sommatieboete (particulier)",
        categoryId: "cat-percentages",
        value: String(params.naturalSommatiePenalty),
      },
      {
        key: "company_no_reaction_penalty",
        name: "Boete geen reactie (bedrijf)",
        categoryId: "cat-percentages",
        value: String(params.companyNoReactionPenalty),
      },
      {
        key: "natural_no_reaction_penalty",
        name: "Boete geen reactie (particulier)",
        categoryId: "cat-percentages",
        value: String(params.naturalNoReactionPenalty),
      },
      // GOP-commissie participant (5%): tarifa CFSB que paga el participante
      // para activar el GOP (LegalProcessService.registerFirstVerdict /
      // registerAdditionalVerdict) — antes era la constante hardcodeada
      // GOP_FEE_RATE.
      {
        key: "gop_fee_rate",
        name: "GOP-commissie participant (%)",
        categoryId: "cat-percentages",
        value: "5",
      },
      // GOP-commissie deurwaarder (5%): tarifa CFSB independiente que paga el
      // alguacil sobre sus propias facturas/costos (LegalProcessService.
      // submitBailiffFeeInvoice) — nunca se mezcla con la del participante.
      {
        key: "gop_bailiff_fee_rate",
        name: "GOP-commissie deurwaarder (%)",
        categoryId: "cat-percentages",
        value: "5",
      },
      // Recargos administrativos por falta de respuesta del deudor (punto 9
      // del análisis CFSB) — obligación con CFSB, no con el participante.
      {
        key: "aanmaning_no_response_fee",
        name: "Administratieve boete geen reactie (aanmaning)",
        categoryId: "cat-percentages",
        value: "150",
      },
      {
        key: "sommatie_no_response_fee",
        name: "Administratieve boete geen reactie (sommatie)",
        categoryId: "cat-percentages",
        value: "250",
      },
      // Herinneringsfrequentie — nuevas claves, antes constantes hardcodeadas
      // en lib/jobs/check_gop_deadlines.ts y check_case_transfer_deadlines.ts.
      {
        key: "gop_prescription_reminder_days",
        name: "GOP verjaringsherinnering (dagen vooraf)",
        categoryId: "cat-reminder-frequency",
        value: "30",
      },
      {
        key: "gop_review_reminder_days",
        name: "GOP revisieherinnering (dagen vooraf)",
        categoryId: "cat-reminder-frequency",
        value: "7",
      },
      {
        key: "case_transfer_acceptance_reminder_days_before",
        name: "Overdracht acceptatieherinnering (dagen vooraf)",
        categoryId: "cat-reminder-frequency",
        value: "2",
      },
      // Notificaties — reusa la categoría general ya sembrada, con filas
      // propias por isla.
      {
        key: "notifications_email_enabled",
        name: "E-mail meldingen actief",
        categoryId: "cat-notifications",
        value: "true",
      },
      {
        key: "notifications_sms_enabled",
        name: "SMS meldingen actief",
        categoryId: "cat-notifications",
        value: "false",
      },
      {
        key: "notifications_whatsapp_enabled",
        name: "WhatsApp meldingen actief",
        categoryId: "cat-notifications",
        value: "false",
      },
    ];

    for (const row of rows) {
      // Prisma no acepta `null` dentro de una where compuesta única
      // (tenantId_jurisdictionId_key) en esta versión — se resuelve con
      // findFirst + create/update en vez de upsert.
      const existing = await prisma.setting.findFirst({
        where: {
          tenantId: null,
          jurisdictionId: jurisdiction.id,
          key: row.key,
        },
      });
      if (existing) continue;

      await prisma.setting.create({
        data: {
          jurisdictionId: jurisdiction.id,
          categoryId: row.categoryId,
          name: row.name,
          key: row.key,
          value: row.value,
        },
      });
    }
  }

  console.log(
    "✓ Jurisdiction settings seeded (tarieven/termijnen/ABB/percentages/herinneringen per eiland)",
  );
}

const FEATURE_FAR_REGISTER = "Financiële afspraken registreren";
const FEATURE_BLC_EXECUTE = "Blok-Check uitvoeren";
const FEATURE_AOP_START = "Administratieve opvolging starten";
const FEATURE_BLK_REGISTER = "Economische blokkade registreren";
const FEATURE_COL_START = "Collectieve opvolging starten";
const FEATURE_GOP_TRANSFER = "Gerechtelijke opvolging overdragen";
const FEATURE_GOP_RECEIVE = "Overgedragen GOP-dossiers ontvangen";
const FEATURE_GOP_MANAGE_PROCEDURES = "Gerechtelijke procedures beheren";
const FEATURE_CASE_HISTORY = "Dossiergeschiedenis bekijken";
const FEATURE_DOCUMENTS_MANAGE = "Documenten beheren";
const FEATURE_VERDICTS_REGISTER =
  "Vonnissen en rechterlijke beslissingen registreren";
const FEATURE_EXECUTION_MANAGE = "Executietraject beheren";

async function seedPlans() {
  const plans = [
    {
      id: PLAN_DEELNEMER_ID,
      name: "Deelnemer",
      description: "Volledige toegang tot alle CFSB-diensten",
      registration_price: 150,
      monthly_price: 150,
      yearly_price: 1800,
      reactivation_price: 75,
      order: 1,
      target_role: "TENANT_ADMIN" as const,
      features: [
        FEATURE_FAR_REGISTER,
        FEATURE_BLC_EXECUTE,
        FEATURE_AOP_START,
        FEATURE_BLK_REGISTER,
        FEATURE_COL_START,
        FEATURE_GOP_TRANSFER,
      ],
    },
    {
      id: PLAN_ADVOCAAT_ID,
      name: "Advocaat",
      description: "Voor advocatenkantoren die namens cliënten incasseren",
      registration_price: 250,
      monthly_price: 250,
      yearly_price: 3000,
      reactivation_price: 125,
      order: 2,
      target_role: "LAWYER" as const,
      features: [
        FEATURE_GOP_RECEIVE,
        FEATURE_GOP_MANAGE_PROCEDURES,
        FEATURE_CASE_HISTORY,
        FEATURE_DOCUMENTS_MANAGE,
      ],
    },
    {
      id: PLAN_DEURWAARDER_ID,
      name: "Deurwaarder",
      description: "Voor gerechtsdeurwaarders en incassokantoren",
      registration_price: 250,
      monthly_price: 250,
      yearly_price: 3000,
      reactivation_price: 100,
      order: 3,
      target_role: "BAILIFF" as const,
      features: [
        FEATURE_GOP_RECEIVE,
        FEATURE_VERDICTS_REGISTER,
        FEATURE_EXECUTION_MANAGE,
        FEATURE_CASE_HISTORY,
        FEATURE_DOCUMENTS_MANAGE,
      ],
    },
  ];

  for (const { id, ...data } of plans) {
    await prisma.plan.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  console.log("✓ Plans seeded");
}

async function seedAdminTenant() {
  await prisma.tenant.upsert({
    where: { id: ADMIN_TENANT_ID },
    update: {},
    create: {
      id: ADMIN_TENANT_ID,
      name: "CFSB",
      code: "CFSB",
      subdomain: "admin",
      contact_email: "bryanhenrry94@gmail.com",
      country_code: "BQ", // Bonaire
      // Entidad jurídica real (nomenclatura acordada) — "CFSB" es la marca
      // de toda la plataforma, no la razón social.
      legal_name: "Centraal Inning Onderneming B.V.",
      jurisdictionId: "jurisdiction-bon-001",
      is_active: true,
      terms_accepted: true,
    },
  });

  console.log("✓ Admin tenant seeded");
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash("Admin@2025!", 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_USER_EMAIL },
    update: {},
    create: {
      email: ADMIN_USER_EMAIL,
      fullname: "Platform Administrator",
      password_hash: passwordHash,
      is_active: true,
    },
  });

  // Membership en el tenant admin
  const membership = await prisma.membership.upsert({
    where: {
      user_id_tenant_id: { user_id: user.id, tenant_id: ADMIN_TENANT_ID },
    },
    update: {},
    create: {
      user_id: user.id,
      tenant_id: ADMIN_TENANT_ID,
      status: "ACTIVE",
    },
  });

  // Rol PLATFORM_OWNER
  await prisma.membershipRole.upsert({
    where: {
      membership_id_role: {
        membership_id: membership.id,
        role: "PLATFORM_OWNER",
      },
    },
    update: {},
    create: {
      membership_id: membership.id,
      role: "PLATFORM_OWNER",
    },
  });

  console.log(`✓ Admin user seeded  →  ${ADMIN_USER_EMAIL}  /  Admin@2025!`);
}

async function seedInterestTypes() {
  const types = [
    {
      id: "interest-wettelijk-001",
      name: "Wettelijke rente (Burgerlijk Wetboek)",
      calculation_type: "FIXED" as const,
      details: [
        { date: "2020-01-01", rate: 2.0 },
        { date: "2021-01-01", rate: 2.0 },
        { date: "2022-01-01", rate: 2.5 },
        { date: "2023-01-01", rate: 4.0 },
        { date: "2024-01-01", rate: 4.0 },
        { date: "2025-01-01", rate: 4.5 },
      ],
    },
    {
      id: "interest-commercieel-001",
      name: "Commerciële rente",
      calculation_type: "VARIABLE" as const,
      details: [
        { date: "2020-01-01", rate: 8.0 },
        { date: "2021-01-01", rate: 8.0 },
        { date: "2022-01-01", rate: 9.0 },
        { date: "2023-01-01", rate: 10.0 },
        { date: "2024-01-01", rate: 10.5 },
        { date: "2025-01-01", rate: 11.0 },
      ],
    },
  ];

  for (const type of types) {
    await prisma.interestType.upsert({
      where: { id: type.id },
      update: {},
      create: {
        id: type.id,
        name: type.name,
        calculation_type: type.calculation_type,
      },
    });

    for (const detail of type.details) {
      await prisma.interestDetail.upsert({
        where: { id: `${type.id}-${detail.date}` },
        update: { rate: detail.rate },
        create: {
          id: `${type.id}-${detail.date}`,
          interest_type_id: type.id,
          date: detail.date,
          rate: detail.rate,
        },
      });
    }
  }

  console.log("✓ Interest types seeded");
}

async function seedSettingCategories() {
  const categories = [
    {
      id: "cat-general",
      key: "general",
      name: "Algemeen",
      description: "Algemene systeeminstellingen",
      icon: "settings",
      sortOrder: 1,
    },
    {
      id: "cat-notifications",
      key: "notifications",
      name: "Notificaties",
      description: "E-mail en systeemmeldingen",
      icon: "notifications",
      sortOrder: 2,
    },
    {
      id: "cat-billing",
      key: "billing",
      name: "Facturering",
      description: "Factuur- en betalingsinstellingen",
      icon: "receipt",
      sortOrder: 3,
    },
    {
      id: "cat-security",
      key: "security",
      name: "Beveiliging",
      description: "Wachtwoord- en sessiebeleid",
      icon: "security",
      sortOrder: 4,
    },
    {
      id: "cat-cop",
      key: "cop",
      name: "Collectieve Opvolging",
      description: "Instellingen voor de collectieve opvolging (COP)",
      icon: "groups",
      sortOrder: 5,
    },
  ];

  for (const cat of categories) {
    await prisma.settingCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: cat,
    });
  }

  // Instellingen per categorie
  const settings = [
    // Algemeen
    {
      id: "setting-app-name",
      categoryId: "cat-general",
      name: "Applicatienaam",
      key: "app_name",
      value: "CFSB",
    },
    {
      id: "setting-support-email",
      categoryId: "cat-general",
      name: "Ondersteuning e-mail",
      key: "support_email",
      value: "support@centraalinning.com",
    },
    // Notificaties
    {
      id: "setting-email-sender",
      categoryId: "cat-notifications",
      name: "Afzender e-mail",
      key: "email_sender",
      value: "no-reply@centraalinning.com",
    },
    {
      id: "setting-email-sender-name",
      categoryId: "cat-notifications",
      name: "Naam afzender",
      key: "email_sender_name",
      value: "CFSB",
    },
    // Facturering
    {
      id: "setting-currency",
      categoryId: "cat-billing",
      name: "Valuta",
      key: "default_currency",
      value: "USD",
    },
    {
      id: "setting-vat-number",
      categoryId: "cat-billing",
      name: "BTW-nummer",
      key: "vat_number",
      value: "",
    },
    // Facturnummering CFSB-facturen (voorheen Parameter.invoice_prefix/
    // invoice_sequence/invoice_number_length — global, niet per isla/tenant,
    // want het is één doorlopende reeks platform-breed).
    {
      id: "setting-invoice-prefix",
      categoryId: "cat-billing",
      name: "Factuurprefix",
      key: "invoice_prefix",
      value: "INV",
    },
    {
      id: "setting-invoice-sequence",
      categoryId: "cat-billing",
      name: "Factuurvolgnummer (startwaarde)",
      key: "invoice_sequence",
      value: "0",
    },
    {
      id: "setting-invoice-number-length",
      categoryId: "cat-billing",
      name: "Lengte factuurnummer",
      key: "invoice_number_length",
      value: "8",
    },
    // Beveiliging
    {
      id: "setting-session-timeout",
      categoryId: "cat-security",
      name: "Sessie-timeout (minuten)",
      key: "session_timeout_minutes",
      value: "60",
    },
    {
      id: "setting-max-login-attempts",
      categoryId: "cat-security",
      name: "Max. inlogpogingen",
      key: "max_login_attempts",
      value: "5",
    },
    // Collectieve Opvolging (COP) — waarde globaal, per tenant/isla
    // overschrijfbaar via SettingsService.resolveNumber/resolveBoolean.
    {
      id: "setting-col-debtor-grace-period-days",
      categoryId: "cat-cop",
      name: "Bedenktermijn debiteur (dagen)",
      key: "col_debtor_grace_period_days",
      value: "2",
    },
    {
      id: "setting-col-auto-continue-from-aop",
      categoryId: "cat-cop",
      name: "Automatisch doorgaan van AOP naar COP",
      key: "col_auto_continue_from_aop",
      value: "false",
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { id: setting.id },
      update: {},
      create: setting,
    });
  }

  console.log("✓ Setting categories and settings seeded");
}

async function main() {
  console.log("🌱 Seeding database…\n");

  await seedJurisdictions();
  await seedAdminTenant();
  await seedAdminUser();
  await seedPlans();
  await seedInterestTypes();
  await seedSettingCategories();
  await seedJurisdictionSettings();

  console.log("\n✅ Seed completo.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
