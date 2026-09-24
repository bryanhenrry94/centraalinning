import { z } from "zod";
import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";

// Gegevens om, in dezelfde stap als het registreren van de blokkade, een
// debiteur te vinden (via identificatie/e-mail, cross-tenant) of aan te
// maken — zelfde velden als FarWizardDebtorSchema, zodat beide via
// DebtorService.findOrCreate lopen. Adres/telefoon zijn hier bewust
// optioneel (in tegenstelling tot FAR): de blokkade zelf vereist ze niet.
export const NewBlockadeDebtorSchema = z.object({
  person_type: z.enum(PersonType),
  identification_type: z.enum(IdentificationType),
  identification: z.string().min(1, "Het identificatienummer is verplicht"),
  fullname: z.string().min(1, "De naam is verplicht"),
  email: z.email({ message: "Het e-mailadres is niet geldig." }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const BlockadeDocumentSchema = z.object({
  file: z.instanceof(File),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  storageKey: z.string().optional(), // este campo es opcional porque en el frontend aún no se genera un storageKey real
});

// Motivos que requieren una nota explicando el contexto además del motivo
// en sí — no alcanza con el enum solo.
const REASONS_REQUIRING_NOTE = ["EXTERNAL_PROCEDURE_COMPLETED", "OTHER"] as const;

export const BlockadeSchema = z
  .object({
    // Ofwel een bestaande debiteur (debtorId, via zoeken) ofwel de gegevens
    // om er één aan te maken (newDebtor) — nooit allebei leeg, zie refine
    // hieronder. Zo kan de gebruiker de debiteur op hetzelfde scherm
    // registreren zonder eerst naar een apart debiteurenscherm te gaan.
    debtorId: z.string().optional(),

    newDebtor: NewBlockadeDebtorSchema.optional(),

    amount: z.number().positive("Het bedrag moet een positief getal zijn"),

    reason: z.enum(["UNPAID_PAYMENT", "EXTERNAL_PROCEDURE_COMPLETED", "OTHER"]),

    // Obligatoria cuando el motivo es "trayecto externo completado" u
    // "otro" — describe qué trayecto/evidencia respalda el bloqueo directo.
    reasonNote: z.string().nullable().optional(),

    registeredAt: z.date().optional(),

    status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]).optional(),

    paymentId: z.string().optional(),

    documents: z
      .array(BlockadeDocumentSchema)
      .min(1, "U dient minstens één document bij te voegen"),

    // Confirmación explícita: quien registra declara que la información y
    // los documentos adjuntos son verídicos (ruta directa, sin pasar por
    // AOP/GOP, así que no hay otra verificación previa del sistema).
    confirmed: z.boolean(),
  })
  .refine(
    (data) =>
      !REASONS_REQUIRING_NOTE.includes(data.reason as (typeof REASONS_REQUIRING_NOTE)[number]) ||
      !!data.reasonNote?.trim(),
    { message: "Beschrijf de reden van de blokkade.", path: ["reasonNote"] },
  )
  .refine((data) => data.confirmed === true, {
    message: "U moet bevestigen dat de gegevens juist zijn voordat u doorgaat.",
    path: ["confirmed"],
  })
  .refine((data) => !!data.debtorId || !!data.newDebtor, {
    message:
      "Selecteer een bestaande debiteur of vul de gegevens van een nieuwe debiteur in.",
    path: ["debtorId"],
  });

export type CreateBlockadeInput = z.infer<typeof BlockadeSchema>;
export type BlockadeDocument = z.infer<typeof BlockadeDocumentSchema>;
