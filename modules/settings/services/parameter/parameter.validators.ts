import { z } from "zod";

export const ParameterSchema = z.object({
  collection_fee_rate: z.number().min(0).max(100),
  abb_rate: z.number().min(0).max(100),
  collection_fee_minimum_amount: z.number().min(0),
  company_aanmaning_term_days: z.number().int().min(0),
  consumer_aanmaning_term_days: z.number().int().min(0),
  company_sommatie_term_days: z.number().int().min(0),
  consumer_sommatie_term_days: z.number().int().min(0),
  small_company_price: z.number().min(0),
  small_company_pfc_contribution: z.number().min(0),
  large_company_price: z.number().min(0),
  large_company_pfc_contribution: z.number().min(0),
  company_aanmaning_penalty: z.number().min(0),
  natural_aanmaning_penalty: z.number().min(0),
  company_sommatie_penalty: z.number().min(0),
  natural_sommatie_penalty: z.number().min(0),
  company_reaction_limit_days: z.number().int().min(0),
  company_no_reaction_penalty: z.number().min(0),
  natural_no_reaction_penalty: z.number().min(0),
  company_payment_agreement_fee: z.number().min(0),
  natural_payment_agreement_fee: z.number().min(0),
  invoice_number_length: z.number().int().min(0),
  invoice_prefix: z.string(),
  invoice_sequence: z.number().int().min(0),
  digital_file_costs: z.number().min(0),
  extra_administrative_costs: z.number().min(0),
  report_financial_pricing: z.number().min(0),
  blok_check_pricing: z.number().min(0),
  bank_account: z.string(),
  bank_name: z.string(),
});

// Type exports and aliases
export type ParameterFormData = z.infer<typeof ParameterSchema>;
export const parameterSchema = ParameterSchema;
