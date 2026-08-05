import { prisma } from "@/lib/prisma";
import { ParameterInput } from "./parameter.type";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";

export class ParameterService {
  static getParameters = async () => {
    const parameter = await prisma.parameter.findFirst();

    if (!parameter) {
      return await prisma.parameter.create({
        data: {},
      });
    }

    return parameter;
  };

  static updateParameters = async (data: ParameterInput) => {
    const parameter = await prisma.parameter.findFirst();

    if (!parameter) {
      return prisma.parameter.create({
        data,
      });
    }

    return prisma.parameter.update({
      where: {
        id: parameter.id,
      },
      data,
    });
  };

  static getParameter = async (): Promise<ParameterInput | null> => {
    const PARAMETER_ID = process.env.NEXT_PUBLIC_PARAMETER_ID;

    if (PARAMETER_ID) {
      const parameter = await prisma.parameter.findUnique({
        where: { id: PARAMETER_ID },
      });

      if (parameter) return parameter;
    }

    return prisma.parameter.findFirst();
  };

  // Tarifas, plazos y ABB por isla/jurisdicción (punto 14 del análisis
  // CFSB — reemplaza al singleton global Parameter). Jerarquía de
  // resolución por cada campo (ver SettingsService.getResolvedSettings):
  //   1) Setting de tenant  2) Setting de la isla  3) columna histórica en
  //   Jurisdiction (punto 13)  4) Parameter global. Así el Superadministrador
  //   cambia tarifas/plazos/ABB editando Settings, sin tocar código — y
  //   nada se rompe para las claves que todavía no tengan un Setting cargado.
  static getParameterForTenant = async (tenantId: string): Promise<ParameterInput | null> => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { jurisdiction: true },
    });
    const jurisdiction = tenant?.jurisdiction;
    const globalParameter = await this.getParameter();

    if (!jurisdiction) return globalParameter;

    const settings = await SettingsService.getResolvedSettings({
      tenantId,
      jurisdictionId: jurisdiction.id,
    });

    const num = (key: string, fallback: number) => {
      const raw = settings[key];
      const parsed = raw !== undefined ? Number(raw) : NaN;
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    return {
      collection_fee_rate: num("collection_fee_rate", jurisdiction.collectionFeeRate),
      abb_rate: num("abb_rate", jurisdiction.abbRate),
      collection_fee_minimum_amount: num(
        "collection_fee_minimum_amount",
        jurisdiction.collectionFeeMinimumAmount,
      ),
      company_aanmaning_term_days: num(
        "company_aanmaning_term_days",
        jurisdiction.companyAanmaningTermDays,
      ),
      consumer_aanmaning_term_days: num(
        "consumer_aanmaning_term_days",
        jurisdiction.consumerAanmaningTermDays,
      ),
      company_sommatie_term_days: num(
        "company_sommatie_term_days",
        jurisdiction.companySommatieTermDays,
      ),
      consumer_sommatie_term_days: num(
        "consumer_sommatie_term_days",
        jurisdiction.consumerSommatieTermDays,
      ),
      small_company_price: num("small_company_price", globalParameter?.small_company_price ?? 0),
      small_company_pfc_contribution: num(
        "small_company_pfc_contribution",
        globalParameter?.small_company_pfc_contribution ?? 0,
      ),
      large_company_price: num("large_company_price", globalParameter?.large_company_price ?? 0),
      large_company_pfc_contribution: num(
        "large_company_pfc_contribution",
        globalParameter?.large_company_pfc_contribution ?? 0,
      ),
      company_aanmaning_penalty: num(
        "company_aanmaning_penalty",
        jurisdiction.companyAanmaningPenalty,
      ),
      natural_aanmaning_penalty: num(
        "natural_aanmaning_penalty",
        jurisdiction.naturalAanmaningPenalty,
      ),
      company_sommatie_penalty: num(
        "company_sommatie_penalty",
        jurisdiction.companySommatiePenalty,
      ),
      natural_sommatie_penalty: num(
        "natural_sommatie_penalty",
        jurisdiction.naturalSommatiePenalty,
      ),
      company_reaction_limit_days: num(
        "company_reaction_limit_days",
        jurisdiction.companyReactionLimitDays,
      ),
      company_no_reaction_penalty: num(
        "company_no_reaction_penalty",
        jurisdiction.companyNoReactionPenalty,
      ),
      natural_no_reaction_penalty: num(
        "natural_no_reaction_penalty",
        jurisdiction.naturalNoReactionPenalty,
      ),
      company_payment_agreement_fee: num(
        "company_payment_agreement_fee",
        jurisdiction.companyPaymentAgreementFee,
      ),
      natural_payment_agreement_fee: num(
        "natural_payment_agreement_fee",
        jurisdiction.naturalPaymentAgreementFee,
      ),
      invoice_number_length: num(
        "invoice_number_length",
        globalParameter?.invoice_number_length ?? 8,
      ),
      invoice_prefix: settings.invoice_prefix ?? globalParameter?.invoice_prefix ?? "",
      invoice_sequence: num("invoice_sequence", globalParameter?.invoice_sequence ?? 0),
      digital_file_costs: num("digital_file_costs", jurisdiction.digitalFileCosts),
      extra_administrative_costs: num(
        "extra_administrative_costs",
        jurisdiction.extraAdministrativeCosts,
      ),
      report_financial_pricing: num(
        "report_financial_pricing",
        jurisdiction.reportFinancialPricing,
      ),
      blok_check_pricing: num("blok_check_pricing", jurisdiction.blokCheckPricing),
      bank_account: jurisdiction.bankAccount || globalParameter?.bank_account || "",
      bank_name: jurisdiction.bankName || globalParameter?.bank_name || "",
    };
  };
}
