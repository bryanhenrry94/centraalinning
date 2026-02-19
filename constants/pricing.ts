// pricing.ts
type IPricing = {
  [role: string]: {
    name: string;
    monthly: number;
    yearly: number;
  };
};

export const PRICING: IPricing = {
  PLATFORM_OWNER: {
    name: "Klant",
    monthly: 150,
    yearly: 150 * 12, // 2 meses gratis si quieres: *10
  },
  LAWYER: {
    name: "Advocaat",
    monthly: 250,
    yearly: 250 * 12,
  },
  BAILIFF: {
    name: "Deurwaarder",
    monthly: 200,
    yearly: 200 * 12,
  },
  BANK: {
    name: "Bank",
    monthly: 500,
    yearly: 500 * 12,
  },
} as const;
