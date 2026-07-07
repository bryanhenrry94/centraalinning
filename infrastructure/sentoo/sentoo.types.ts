export interface SentooPaymentResult {
  success: boolean;
  payment?: {
    id: string;
    url: string;
    qrCode: string;
    payload: Record<string, string>;
  };
  reason?: "BANK_REJECTED" | "SENTOO_ERROR" | "INTERNAL_ERROR";
  error?: string;
  raw?: any; // respuesta original de Sentoo para trazabilidad
}

export interface SentooPaymentCreate {
  amount: number;
  currency: string;
  description: string;
  reference: string;
}
