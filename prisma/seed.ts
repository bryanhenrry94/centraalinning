import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// IDs fijos para poder referenciarlos entre sí y desde el .env
const ADMIN_TENANT_ID = "0874303e-6795-46ef-8416-5d76bba8071b";
const PARAMETER_ID = "0874303e-6795-46ef-8416-5d76bba8071b";
const ADMIN_USER_EMAIL = "admin@centraalinning.com";
const PLAN_SMALL_ID = "plan-small-001";
const PLAN_LARGE_ID = "plan-large-001";

async function seedParameter() {
  await prisma.parameter.upsert({
    where: { id: PARAMETER_ID },
    update: {},
    create: {
      id: PARAMETER_ID,

      // Tarifa de cobranza AOP
      collection_fee_rate: 15,          // 15 % sobre el monto principal
      collection_fee_minimum_amount: 75, // mínimo USD 75

      // ABB (belasting) – impuesto Bonaire/Curaçao ~9 %
      abb_rate: 9,

      // Plazos aanmaning (recordatorio de pago)
      company_aanmaning_term_days: 14,
      consumer_aanmaning_term_days: 30,

      // Plazos sommatie (intimación formal)
      company_sommatie_term_days: 7,
      consumer_sommatie_term_days: 14,

      // Precios de membresía
      small_company_price: 49,
      small_company_pfc_contribution: 5,
      large_company_price: 99,
      large_company_pfc_contribution: 10,

      // Penalidades por incumplimiento de acuerdo de pago
      company_aanmaning_penalty: 25,
      natural_aanmaning_penalty: 15,
      company_sommatie_penalty: 50,
      natural_sommatie_penalty: 25,

      // Límite de respuesta y penalidades sin reacción
      company_reaction_limit_days: 5,
      company_no_reaction_penalty: 100,
      natural_no_reaction_penalty: 50,

      // Honorarios por acuerdo de pago
      company_payment_agreement_fee: 50,
      natural_payment_agreement_fee: 25,

      // Facturación
      invoice_number_length: 8,
      invoice_prefix: "INV",
      invoice_sequence: 0,

      // Costos adicionales
      digital_file_costs: 25,
      extra_administrative_costs: 0,
      report_financial_pricing: 35,

      // Banco receptor
      bank_name: "MCB (Maduro & Curiel's Bank)",
      bank_account: "123456789",

      // Sistema
      currency_code: "USD",
      timezone: "America/Kralendijk",
    },
  });

  console.log("✓ Parameter seeded");
}

async function seedPlans() {
  const plans = [
    {
      id: PLAN_SMALL_ID,
      name: "Starter",
      description: "Voor kleine bedrijven tot 50 medewerkers",
      monthly_price: 49,
      yearly_price: 490,
      reactivation_price: 25,
      features: {
        CREATE_COLLECTION: true,
        BLOK_CHECK: true,
        CREATE_PAYMENT: true,
        VIEW_DASHBOARD: true,
        max_collections_per_month: 50,
        max_debtors: 200,
      },
    },
    {
      id: PLAN_LARGE_ID,
      name: "Professional",
      description: "Voor grote bedrijven en incassokantoren",
      monthly_price: 99,
      yearly_price: 990,
      reactivation_price: 50,
      features: {
        CREATE_COLLECTION: true,
        BLOK_CHECK: true,
        CREATE_PAYMENT: true,
        VIEW_DASHBOARD: true,
        max_collections_per_month: -1, // ilimitado
        max_debtors: -1,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
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
      name: "CFSB – Centraal Inning",
      code: "CFSB",
      subdomain: "admin",
      contact_email: "admin@centraalinning.com",
      country_code: "BQ", // Bonaire
      legal_name: "CFSB N.V.",
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
    where: { user_id_tenant_id: { user_id: user.id, tenant_id: ADMIN_TENANT_ID } },
    update: {},
    create: {
      user_id: user.id,
      tenant_id: ADMIN_TENANT_ID,
      status: "ACTIVE",
    },
  });

  // Rol PLATFORM_OWNER
  await prisma.membershipRole.upsert({
    where: { membership_id_role: { membership_id: membership.id, role: "PLATFORM_OWNER" } },
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
      value: "Centraal Inning",
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
      value: "CFSB – Centraal Inning",
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

  await seedAdminTenant();
  await seedAdminUser();
  await seedParameter();
  await seedPlans();
  await seedInterestTypes();
  await seedSettingCategories();

  console.log("\n✅ Seed completo.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
