import { prisma } from "@/lib/prisma";
import { getDebtClaimById } from "@/modules/collection/actions/collection-case.actions";
import { registerInvitation } from "@/modules/auth/actions/invitation.actions";
import { protocol, rootDomain } from "@/lib/config";
import {
  sendAanmaningEmail,
  sendIngebrekestellingMail,
  sendSommatieEmail,
} from "@/modules/collection/services/collection-mail.service";
import { sendBlokkadeMail } from "@/modules/blockade/services/blockade-mail.service";
import { PersonType } from "@/shared/constants/person-type";
import { UserRole } from "@/shared/constants/user-role";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

type AOPStep = "REMINDER" | "FINAL_NOTICE" | "DEFAULT_NOTICE" | "BLK_NOTIFICATION";

export class CollectionNotificationService {
  static sendNotification = async (debtClaimId: string) => {
    if (!debtClaimId) throw new Error("debtClaimId is required");

    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId },
      include: {
        steps: { orderBy: { id: "desc" }, take: 1 },
      },
    });

    if (!aop) throw new Error("AdministrativeCollection not found");

    const currentStep = aop.steps[0]?.step as AOPStep | undefined;

    switch (currentStep) {
      case "REMINDER":
        return this.sendAanmaning(debtClaimId);
      case "FINAL_NOTICE":
        return this.sendSommatie(debtClaimId);
      case "DEFAULT_NOTICE":
        return this.sendIngebrekestelling(debtClaimId);
      case "BLK_NOTIFICATION":
        return this.sendBlokkade(debtClaimId);
      default:
        return;
    }
  };

  static sendAanmaning = async (debtClaimId: string): Promise<string> => {
    try {
      const claim = await getDebtClaimById(debtClaimId);
      const debtor = await prisma.debtor.findUnique({
        where: { id: claim.debtorId },
        include: { person: true },
      });
      if (!debtor) throw new Error("Deudor no encontrado");
      if (!debtor.email) throw new Error("El deudor no tiene email");

      const debtorName =
        `${debtor.person?.first_name ?? ""} ${debtor.person?.last_name ?? ""}`.trim() ||
        debtor.person?.business_name;

      let invitationLink = `${protocol}://auth.${rootDomain}/login`;

      if (debtor.user_id === null) {
        const invitation = await registerInvitation({
          tenantId: debtor.tenant_id,
          email: debtor.email,
          role: UserRole.DEBTOR,
          fullname: debtorName || "Debtor",
          debtor_id: debtor.id,
        });
        if (invitation.status === true && invitation.token) {
          invitationLink = `${protocol}://auth.${rootDomain}/invitation/${invitation.token}`;
        }
      }

      await sendAanmaningEmail(debtor.email, debtClaimId, invitationLink);
      return "Aanmaning sent successfully";
    } catch (error) {
      console.error("Error sending Aanmaning:", error);
      throw new Error("Failed to send Aanmaning");
    }
  };

  static sendSommatie = async (debtClaimId: string): Promise<string> => {
    try {
      const claim = await getDebtClaimById(debtClaimId);
      const debtor = await prisma.debtor.findUnique({ where: { id: claim.debtorId } });
      if (!debtor?.email) throw new Error("El deudor no tiene email");
      await sendSommatieEmail(debtor.email, debtClaimId);
      return "Sommatie sent successfully";
    } catch (error) {
      console.error("Error sending Sommatie:", error);
      throw new Error("Failed to send Sommatie");
    }
  };

  static sendIngebrekestelling = async (debtClaimId: string): Promise<string> => {
    try {
      const claim = await getDebtClaimById(debtClaimId);
      const debtor = await prisma.debtor.findUnique({ where: { id: claim.debtorId } });
      if (!debtor?.email) throw new Error("El deudor no tiene email");
      await sendIngebrekestellingMail(debtor.email, debtClaimId);
      return "Ingebrekestelling sent successfully";
    } catch (error) {
      console.error("Error sending Ingebrekestelling:", error);
      throw new Error("Failed to send Ingebrekestelling");
    }
  };

  static sendBlokkade = async (debtClaimId: string): Promise<string> => {
    try {
      const claim = await getDebtClaimById(debtClaimId);
      const debtor = await prisma.debtor.findUnique({ where: { id: claim.debtorId } });
      if (!debtor?.email) throw new Error("El deudor no tiene email");
      await sendBlokkadeMail(debtor.email, debtClaimId);
      return "Blokkade sent successfully";
    } catch (error) {
      console.error("Error sending Blokkade:", error);
      throw new Error("Failed to send Blokkade");
    }
  };

  static getStepsForClaim = async (debtClaimId: string) => {
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId },
      include: { steps: { orderBy: { id: "asc" } } },
    });
    return aop?.steps ?? [];
  };

  static getNotificationDays = async (
    step: AOPStep,
    person_type: PersonType,
  ): Promise<number> => {
    const param = await ParameterService.getParameter();
    if (!param) throw new Error("Parameter not found");

    if (step === "REMINDER") {
      return person_type === PersonType.INDIVIDUAL
        ? param.consumer_aanmaning_term_days
        : param.company_aanmaning_term_days;
    }
    if (step === "FINAL_NOTICE") {
      return person_type === PersonType.INDIVIDUAL
        ? param.consumer_sommatie_term_days
        : param.company_sommatie_term_days;
    }
    return 0;
  };

  static getLastStepDate = async (
    debtClaimId: string,
    step: AOPStep,
  ): Promise<Date> => {
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId },
    });
    if (!aop) return new Date(0);

    const record = await prisma.administrativeCollectionStep.findFirst({
      where: { collectionId: aop.id, step },
      orderBy: { id: "desc" },
    });

    return record?.sentAt ?? new Date(0);
  };
}
