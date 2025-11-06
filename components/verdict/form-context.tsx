"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import z from "zod";

import { VerdictCreateForm } from "@/lib/validations/verdict";
import { createVerdict, updateVerdict } from "@/app/actions/verdict";
import { useTenant } from "@/hooks/useTenant";
import { AlertService } from "@/lib/alerts";
import { notifyError, notifyInfo } from "@/lib/notifications";

interface VerdictFormProviderProps {
  children: React.ReactNode;
  id?: string;
  defaultValues: Record<string, any>;
  setSubmitting?: (submitting: boolean) => void;
}

export function VerdictFormProvider({
  children,
  id,
  defaultValues,
  setSubmitting,
}: VerdictFormProviderProps) {
  const { tenant } = useTenant();
  const router = useRouter();

  const methods = useForm<z.infer<typeof VerdictCreateForm>>({
    resolver: zodResolver(VerdictCreateForm) as Resolver<
      z.infer<typeof VerdictCreateForm>
    >,
    defaultValues,
  });

  const serializedDefaults = useMemo(
    () => JSON.stringify(defaultValues),
    [defaultValues]
  );

  useEffect(() => {
    if (!defaultValues) return;
    methods.reset(JSON.parse(serializedDefaults));
  }, [serializedDefaults]);

  const handleFormSubmit = async (data: z.infer<typeof VerdictCreateForm>) => {
    try {
      setSubmitting?.(true);

      // Update flow
      if (id) {
        const updated = await updateVerdict(id, data);
        if (updated) {
          notifyInfo("Registratie is bijgewerkt");
        } else {
          notifyError("Bijwerken mislukt. Probeer het opnieuw.");
        }
        return;
      }

      // Create flow
      if (!tenant) {
        notifyError(
          "Onverwerkte fout, neem contact op met uw systeembeheerder"
        );
        return;
      }

      const confirmed = await AlertService.showConfirm(
        "Weet je het zeker?",
        "Deze actie registreert het vonnis. Wil je doorgaan?",
        "Ja, registreren",
        "Annuleren"
      );

      if (!confirmed) return;

      const newVerdict = await createVerdict(data, tenant.id);
      if (!newVerdict) {
        notifyError(
          "Er is een fout opgetreden bij het aanmaken van de registratie."
        );
        return;
      }

      notifyInfo("Registratie is succesvol aangemaakt");
      router.push(`/dashboard/verdicts/${newVerdict.id}/edit`);
    } catch (error) {
      console.error("Error submitting verdict form:", error);
      notifyError(
        "Er is een fout opgetreden bij het verzenden van het formulier."
      );
    } finally {
      setSubmitting?.(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleFormSubmit)}>{children}</form>
    </FormProvider>
  );
}
