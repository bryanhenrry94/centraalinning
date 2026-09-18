import { prisma } from "@/lib/prisma";
import { ParameterInput } from "./parameter.type";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";

// Únicos valores por defecto que quedan "en código": se usan solo cuando
// ni el tenant, ni su isla, ni ningún Setting global tienen todavía un
// valor cargado (p.ej. un tenant sin jurisdictionId asignado). Reemplazan
// al antiguo singleton `Parameter` (eliminado — ver docs/plan-alineacion-
// cfsb.md punto 2.5); el Superadministrador sigue pudiendo cambiar
// cualquiera de estos valores sin tocar código editando `Setting`.
const DEFAULT_PARAMETER: ParameterInput = {
  collection_fee_rate: 15,
  abb_rate: 6,
  collection_fee_minimum_amount: 40,
  company_aanmaning_term_days: 5,
  consumer_aanmaning_term_days: 14,
  company_sommatie_term_days: 7,
  consumer_sommatie_term_days: 14,
  company_aanmaning_penalty: 25,
  natural_aanmaning_penalty: 15,
  company_sommatie_penalty: 50,
  natural_sommatie_penalty: 25,
  company_reaction_limit_days: 5,
  company_no_reaction_penalty: 100,
  natural_no_reaction_penalty: 50,
  company_payment_agreement_fee: 50,
  natural_payment_agreement_fee: 25,
  invoice_number_length: 8,
  invoice_prefix: "INV",
  invoice_sequence: 0,
  digital_file_costs: 10,
  extra_administrative_costs: 0,
  report_financial_pricing: 35,
  blok_check_pricing: 35,
  blockade_registration_pricing: 35,
  far_registration_fee: 10,
  bank_account: "",
  bank_name: "",
};

export class ParameterService {
  // Tarifas, plazos y ABB por isla/jurisdicción (punto 14 del análisis
  // CFSB). Jerarquía de resolución por cada campo (ver
  // SettingsService.getResolvedSettings): 1) Setting de tenant 2) Setting
  // de la isla 3) columna histórica en Jurisdiction (punto 13) 4) default
  // fijo (DEFAULT_PARAMETER, arriba). Así el Superadministrador cambia
  // tarifas/plazos/ABB editando Settings, sin tocar código — y nada se
  // rompe para las claves que todavía no tengan un Setting cargado.
  static getParameterForTenant = async (tenantId: string): Promise<ParameterInput> => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { jurisdiction: true },
    });
    const jurisdiction = tenant?.jurisdiction;

    const settings = await SettingsService.getResolvedSettings({
      tenantId,
      jurisdictionId: jurisdiction?.id ?? null,
    });

    const num = (key: string, fallback: number) => {
      const raw = settings[key];
      const parsed = raw !== undefined ? Number(raw) : NaN;
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    return {
      collection_fee_rate: num(
        "collection_fee_rate",
        jurisdiction?.collectionFeeRate ?? DEFAULT_PARAMETER.collection_fee_rate,
      ),
      abb_rate: num("abb_rate", jurisdiction?.abbRate ?? DEFAULT_PARAMETER.abb_rate),
      collection_fee_minimum_amount: num(
        "collection_fee_minimum_amount",
        jurisdiction?.collectionFeeMinimumAmount ?? DEFAULT_PARAMETER.collection_fee_minimum_amount,
      ),
      company_aanmaning_term_days: num(
        "company_aanmaning_term_days",
        jurisdiction?.companyAanmaningTermDays ?? DEFAULT_PARAMETER.company_aanmaning_term_days,
      ),
      consumer_aanmaning_term_days: num(
        "consumer_aanmaning_term_days",
        jurisdiction?.consumerAanmaningTermDays ?? DEFAULT_PARAMETER.consumer_aanmaning_term_days,
      ),
      company_sommatie_term_days: num(
        "company_sommatie_term_days",
        jurisdiction?.companySommatieTermDays ?? DEFAULT_PARAMETER.company_sommatie_term_days,
      ),
      consumer_sommatie_term_days: num(
        "consumer_sommatie_term_days",
        jurisdiction?.consumerSommatieTermDays ?? DEFAULT_PARAMETER.consumer_sommatie_term_days,
      ),
      company_aanmaning_penalty: num(
        "company_aanmaning_penalty",
        jurisdiction?.companyAanmaningPenalty ?? DEFAULT_PARAMETER.company_aanmaning_penalty,
      ),
      natural_aanmaning_penalty: num(
        "natural_aanmaning_penalty",
        jurisdiction?.naturalAanmaningPenalty ?? DEFAULT_PARAMETER.natural_aanmaning_penalty,
      ),
      company_sommatie_penalty: num(
        "company_sommatie_penalty",
        jurisdiction?.companySommatiePenalty ?? DEFAULT_PARAMETER.company_sommatie_penalty,
      ),
      natural_sommatie_penalty: num(
        "natural_sommatie_penalty",
        jurisdiction?.naturalSommatiePenalty ?? DEFAULT_PARAMETER.natural_sommatie_penalty,
      ),
      company_reaction_limit_days: num(
        "company_reaction_limit_days",
        jurisdiction?.companyReactionLimitDays ?? DEFAULT_PARAMETER.company_reaction_limit_days,
      ),
      company_no_reaction_penalty: num(
        "company_no_reaction_penalty",
        jurisdiction?.companyNoReactionPenalty ?? DEFAULT_PARAMETER.company_no_reaction_penalty,
      ),
      natural_no_reaction_penalty: num(
        "natural_no_reaction_penalty",
        jurisdiction?.naturalNoReactionPenalty ?? DEFAULT_PARAMETER.natural_no_reaction_penalty,
      ),
      company_payment_agreement_fee: num(
        "company_payment_agreement_fee",
        jurisdiction?.companyPaymentAgreementFee ?? DEFAULT_PARAMETER.company_payment_agreement_fee,
      ),
      natural_payment_agreement_fee: num(
        "natural_payment_agreement_fee",
        jurisdiction?.naturalPaymentAgreementFee ?? DEFAULT_PARAMETER.natural_payment_agreement_fee,
      ),
      invoice_number_length: num("invoice_number_length", DEFAULT_PARAMETER.invoice_number_length),
      invoice_prefix: settings.invoice_prefix ?? DEFAULT_PARAMETER.invoice_prefix,
      invoice_sequence: num("invoice_sequence", DEFAULT_PARAMETER.invoice_sequence),
      digital_file_costs: num(
        "digital_file_costs",
        jurisdiction?.digitalFileCosts ?? DEFAULT_PARAMETER.digital_file_costs,
      ),
      extra_administrative_costs: num(
        "extra_administrative_costs",
        jurisdiction?.extraAdministrativeCosts ?? DEFAULT_PARAMETER.extra_administrative_costs,
      ),
      report_financial_pricing: num(
        "report_financial_pricing",
        jurisdiction?.reportFinancialPricing ?? DEFAULT_PARAMETER.report_financial_pricing,
      ),
      blok_check_pricing: num(
        "blok_check_pricing",
        jurisdiction?.blokCheckPricing ?? DEFAULT_PARAMETER.blok_check_pricing,
      ),
      blockade_registration_pricing: num(
        "blockade_registration_pricing",
        jurisdiction?.blockadeRegistrationPricing ?? DEFAULT_PARAMETER.blockade_registration_pricing,
      ),
      far_registration_fee: num(
        "far_registration_fee",
        jurisdiction?.farRegistrationFee ?? DEFAULT_PARAMETER.far_registration_fee,
      ),
      bank_account: jurisdiction?.bankAccount || DEFAULT_PARAMETER.bank_account,
      bank_name: jurisdiction?.bankName || DEFAULT_PARAMETER.bank_name,
    };
  };
}
