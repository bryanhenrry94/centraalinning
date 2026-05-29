export interface Parameter {
  id: string;

  collection_fee_rate: number;
  collection_fee_minimum_amount: number;

  abb_rate: number;

  company_aanmaning_term_days: number;
  consumer_aanmaning_term_days: number;

  company_sommatie_term_days: number;
  consumer_sommatie_term_days: number;

  company_aanmaning_penalty: number;
  natural_aanmaning_penalty: number;

  company_sommatie_penalty: number;
  natural_sommatie_penalty: number;

  invoice_prefix: string;
  invoice_sequence: number;
  invoice_number_length: number;

  bank_name: string;
  bank_account: string;
}