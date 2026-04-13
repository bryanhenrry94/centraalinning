"use server";
import prisma from "@/lib/prisma";
import { CollectionCase } from "@/lib/validations/collection";
import { getCollectionById } from "@/actions/collection-case";
import { Notification } from "@/lib/validations/notification";
import { getParameter } from "@/actions/parameter";
import { NotificationType } from "@/lib/validations/notification";

import { registerInvitation } from "./tenant-invitation";
import { protocol, rootDomain } from "@/lib/config";
import {
  sendAanmaningEmail,
  sendBlokkadeMail,
  sendIngebrekestellingMail,
  sendSommatieEmail,
} from "./email";
import { $Enums } from "@prisma/client";

export const sendNotification = async (caseId: string) => {
  if (!caseId) {
    throw new Error("Notification caseId is required");
  }

  // Check if the notification.collectionCase exists
  const collection = await getCollectionById(caseId);
  if (!collection) {
    throw new Error("Collection not found");
  }

  // Get the last notification for the collection case
  switch (collection.status) {
    case $Enums.CollectionCaseStatus.AANMANING:
      console.log("Sending Aanmaning...");
      return await sendAanmaning(collection);
    case $Enums.CollectionCaseStatus.SOMMATIE:
      return await sendSommatie(collection);
    case $Enums.CollectionCaseStatus.INGEBREKESTELLING:
      return await sendIngebrekestelling(collection);
    case $Enums.CollectionCaseStatus.BLOKKADE:
      return await sendBlokkade(collection);
    default:
      return;
  }
};

export const createNotification = async (
  caseId: string,
  type: NotificationType,
  title: string,
  message: string,
): Promise<Notification> => {
  if (!caseId) {
    throw new Error("Notification caseId is required");
  }

  const notification = await prisma.collectionCaseNotification.create({
    data: {
      collection_case_id: caseId,
      type,
      sent_at: new Date(),
      title,
      message,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return {
    ...notification,
    type: notification.type as Notification["type"],
  };
};

export const sendAanmaning = async (
  collection: CollectionCase,
): Promise<string> => {
  try {
    console.log(
      "Send_Aanmaning: Starting process for collection ID:",
      collection.id,
    );
    // valida el tenant
    if (!collection.tenant_id) {
      throw new Error("Tenant ID not found");
    }

    console.log("Send_Aanmaning: Tenant ID found:", collection.tenant_id);
    // Obtiene datos del deudor
    const debtor = await prisma.debtor.findUnique({
      where: { id: collection.debtor_id },
      include: { person: true },
    });
    if (!debtor) {
      throw new Error("No se encontró el deudor");
    }

    console.log("Send_Aanmaning: Debtor found:", debtor);

    // Si el deudor no tiene email, no envía la notificación
    if (!debtor.email) {
      throw new Error("El deudor no tiene email");
    }

    const debtorName =
      `${debtor.person?.first_name} ${debtor.person?.last_name}`.trim() ||
      debtor.person?.business_name;

    // Si el deudor no tiene usuario, enviar invitación para registrarse
    let invitationLink: string = `${protocol}://${rootDomain}/`;

    console.log("Send_Aanmaning: ", debtor);

    // Verifica si el deudor ya tiene usuario
    if (debtor.user_id === null) {
      console.log("Send_Aanmaning: Sending invitation link to debtor");
      // Registrar invitación
      const invitation = await registerInvitation({
        tenantId: debtor.tenant_id,
        email: debtor.email,
        role: "DEBTOR",
        fullname: debtorName || "Debtor",
        debtor_id: debtor.id,
      });

      console.log("Send_Aanmaning: Invitation created:", invitation);

      if (invitation.status === true && invitation.token) {
        invitationLink = `${protocol}://${rootDomain}/invitation/${invitation.token}`;
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: collection.tenant_id },
    });
    if (!tenant) {
      throw new Error("No se encontró el tenant");
    }

    console.log(
      "Send_Aanmaning: Sending Aanmaning email to debtor at",
      debtor.email,
    );

    if (debtor?.email) {
      console.log("Send_Aanmaning: Preparing to send email to", debtor.email);
      await sendAanmaningEmail(debtor?.email, collection.id, invitationLink);

      await createNotification(
        collection.id,
        NotificationType.AANMANING,
        "Eerste incassoaankondiging",
        "De eerste incassoaankondiging is verzonden.",
      );
      console.log(
        "Send_Aanmaning: Aanmaning email sent successfully to",
        debtor.email,
      );
    }

    return "Aanmaning sent successfully";
  } catch (error) {
    console.error("Error sending Aanmaning:", error);
    throw new Error("Failed to send Aanmaning");
  }
};

export const sendSommatie = async (
  collection: CollectionCase,
): Promise<string> => {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: collection.debtor_id },
    });
    if (!debtor) {
      throw new Error("No se encontró el deudor");
    }

    if (debtor?.email) {
      await sendSommatieEmail(debtor?.email, collection.id);
      await createNotification(
        collection.id,
        NotificationType.SOMMATIE,
        "Tweede incassobericht",
        "De tweede incassoaankondiging is verzonden.",
      );
    }

    return "Sommatie sent successfully";
  } catch (error) {
    console.error("Error sending Aanmaning:", error);
    throw new Error("Failed to send Aanmaning");
  }
};

export const sendIngebrekestelling = async (
  collection: CollectionCase,
): Promise<string> => {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: collection.debtor_id },
    });
    if (!debtor) {
      throw new Error("No se encontró el deudor");
    }

    // Si el deudor no tiene email, no envía la notificación
    if (!debtor.email) {
      throw new Error("El deudor no tiene email");
    }

    if (debtor?.email) {
      await sendIngebrekestellingMail(debtor?.email, collection.id);

      await createNotification(
        collection.id,
        NotificationType.INGEBREKESTELLING,
        "Derde incassoaankondiging",
        "De derde incassoaankondiging is verzonden.",
      );
    }

    return "Ingebrekestelling sent successfully";
  } catch (error) {
    console.error("Error sending Ingebrekestelling:", error);
    throw new Error("Failed to send Ingebrekestelling");
  }
};

export const sendBlokkade = async (
  collection: CollectionCase,
): Promise<string> => {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: collection.debtor_id },
    });
    if (!debtor) {
      throw new Error("No se encontró el deudor");
    }

    // Si el deudor no tiene email, no envía la notificación
    if (!debtor.email) {
      throw new Error("El deudor no tiene email");
    }

    if (debtor?.email) {
      await sendBlokkadeMail(debtor?.email, collection.id);

      await createNotification(
        collection.id,
        NotificationType.BLOKKADE,
        "Notificatie van financiële blokkade",
        "De notificatie van financiële blokkade is verzonden.",
      );
    }

    return "Financiele Blokkade sent successfully";
  } catch (error) {
    console.error("Error sending FinancieleBlokkade:", error);
    throw new Error("Failed to send FinancieleBlokkade");
  }
};

export const getNotificationDays = async (
  status: $Enums.CollectionCaseStatus,
  person_type: $Enums.PersonType,
): Promise<number> => {
  const _parameter = await getParameter();

  if (!_parameter) {
    throw new Error("Parameter not found");
  }

  if (status === $Enums.CollectionCaseStatus.AANMANING) {
    return person_type === $Enums.PersonType.INDIVIDUAL
      ? _parameter.consumer_aanmaning_term_days
      : _parameter.company_aanmaning_term_days;
  }

  if (status === $Enums.CollectionCaseStatus.SOMMATIE) {
    return person_type === $Enums.PersonType.INDIVIDUAL
      ? _parameter.consumer_sommatie_term_days
      : _parameter.company_sommatie_term_days;
  }

  return 0;
};

export const getLastNotificationDate = async (
  caseId: string,
  type: $Enums.CollectionCaseStatus,
): Promise<Date> => {
  // Fetch the notification collection record based on collection and type
  const notificationRecord = await prisma.collectionCaseNotification.findFirst({
    where: {
      collection_case_id: caseId,
      type: type, // Replace with the appropriate type if needed
    },
    orderBy: {
      sent_at: "desc", // Get the most recent notification
    },
  });

  if (!notificationRecord) {
    throw new Error(`Notification of type ${type} not found`);
  }

  return notificationRecord.sent_at;
};

export const getLastNotificationByCollectionCase = async (
  collection_case_id: string,
): Promise<Notification | null> => {
  const notification = await prisma.collectionCaseNotification.findFirst({
    where: { collection_case_id },
    orderBy: { sent_at: "desc" },
  });

  if (!notification) {
    return null;
  }

  return {
    ...notification,
    type: notification.type as Notification["type"],
  };
};

export const getAllNotificationsByCollectionCase = async (
  collection_case_id: string,
): Promise<Notification[]> => {
  const notifications = await prisma.collectionCaseNotification.findMany({
    where: { collection_case_id },
    orderBy: { sent_at: "desc" },
  });

  // Map the Prisma result to your Notification type if needed
  return notifications.map((n) => ({
    ...n,
    type: n.type as Notification["type"],
  }));
};
