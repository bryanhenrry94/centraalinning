import { z } from "zod";

const BillingCycles = ["MONTHLY", "YEARLY"] as const;

export const SignUpSchema = z
  .object({
    fullname: z
      .string()
      .regex(/^\S.*\S$/, "Naam kan niet beginnen of eindigen met een spatie"),
    email: z
      .string()
      .nonempty("E-mail is verplicht")
      .email("Ongeldig e-mailformaat")
      .regex(/^\S.*\S$/, "E-mail kan niet beginnen of eindigen met een spatie"),
    password: z
      .string()
      .min(8, "Wachtwoord moet minstens 8 tekens lang zijn")
      .regex(
        /^\S.*\S$/,
        "Wachtwoord kan niet beginnen of eindigen met een spatie",
      ),
    confirm_password: z
      .string()
      .nonempty("Wachtwoord bevestigen is verplicht")
      .regex(
        /^\S.*\S$/,
        "Bevestigingswachtwoord kan niet beginnen of eindigen met een spatie",
      ),
    phone: z.string().optional(),
    kvk: z.string().nonempty("KVK is verplicht"),
    company_name: z.string().nonempty("Bedrijfsnaam is verplicht"),
    country: z.string().nonempty("Land is verplicht"),
    accept_terms: z.boolean().refine((val) => val === true, {
      message: "U moet de algemene voorwaarden accepteren",
    }),
    plan_id: z.string().nonempty("Plan is verplicht"),
    billing_cycle: z.enum(BillingCycles, "Ongeldige factureringscyclus"),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Wachtwoorden moeten overeenkomen",
  });
