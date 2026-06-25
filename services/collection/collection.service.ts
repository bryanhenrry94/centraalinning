import {
  CollectionCaseCreate,
  CollectionCaseCreateSchema,
} from "@/lib/validations/collection";
import { ContractService } from "../contract/contract.service";
import { prisma } from "@/lib/prisma";
import { CollectionCaseStatus } from "@/constants/collection-case-status";
import { ParameterService } from "../parameter/parameter.service";
import { PersonType } from "@/constants/person-type";

import { CollectionNotificationService } from "@/services/collection/collection-notification.service";
import {
  CollectionCaseFilter,
  CollectionCaseResponse,
} from "./collection.type";
import { MailService } from "../mail/mail.service";
import { ParameterInput } from "../parameter/parameter.type";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { PaymentCreate } from "@/lib/validations/payment";
import { PaymentService } from "../payments/payment.service";

export class CollectionService {
  static createFromContract = async (
    contract: Awaited<ReturnType<typeof ContractService.getById>>,
    debtorId: string,
  ) => {
    if (!contract) {
      throw new Error("Contract not found");
    }

    const [parameter, debtor] = await Promise.all([
      ParameterService.getParameter(),

      prisma.debtor.findUnique({
        where: { id: debtorId },
        include: { person: true },
      }),
    ]);

    if (!parameter) {
      throw new Error("No se encontró el parámetro");
    }

    if (!debtor) {
      throw new Error("Deudor no encontrado");
    }

    const issue_date = new Date();
    const amount_original = Number(contract.amount);

    if (amount_original <= 0) {
      throw new Error("Invalid contract amount");
    }

    const calculations = this.calculateAmounts(amount_original, parameter);

    const due_date = await this.calculateDueDate(
      CollectionCaseStatus.AANMANING,
      (debtor.person?.person_type as PersonType) || PersonType.INDIVIDUAL,
      issue_date,
    );

    const collectionCaseData: CollectionCaseCreate = {
      issue_date,
      due_date,

      status: CollectionCaseStatus.AANMANING,

      debtor_id: debtorId,

      amount_original,

      fee_rate: calculations.feeRate,
      fee_amount: calculations.feeAmount,

      abb_rate: calculations.abbRate,
      abb_amount: calculations.abbAmount,

      total_fined: 0,

      total_due: calculations.totalDue,
      total_to_receive: calculations.totalToReceive,

      total_paid: 0,

      balance: calculations.balance,

      document_number: contract.reference_number || "",
    };

    return this.create(collectionCaseData, contract.tenant_id);
  };

  private static calculateAmounts(amount: number, parameter: ParameterInput) {
    let feeAmount = Number(
      ((amount * parameter.collection_fee_rate) / 100).toFixed(2),
    );

    if (feeAmount < parameter.collection_fee_minimum_amount) {
      feeAmount = parameter.collection_fee_minimum_amount;
    }

    const abbAmount = Number(
      ((feeAmount * parameter.abb_rate) / 100).toFixed(2),
    );

    const totalDue = Number(
      (amount + feeAmount + abbAmount + parameter.digital_file_costs).toFixed(
        2,
      ),
    );

    const totalToReceive = Number(
      (amount - feeAmount - abbAmount - parameter.digital_file_costs).toFixed(
        2,
      ),
    );

    return {
      feeRate: parameter.collection_fee_rate,
      feeAmount,

      abbRate: parameter.abb_rate,
      abbAmount,

      totalDue,
      totalToReceive,

      balance: totalDue,
    };
  }

  private static async calculateDueDate(
    status: CollectionCaseStatus,
    personType: PersonType,
    issue_date: Date,
  ) {
    const day_term = await CollectionNotificationService.getNotificationDays(
      status,
      personType,
    );

    const daysToAdd =
      typeof day_term === "number" && !isNaN(day_term) ? day_term : 0;

    return new Date(issue_date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private static buildChatRoomName(
    first_name?: string,
    last_name?: string,
    business_name?: string,
    referenceNumber?: string,
  ) {
    const debtorName =
      `${first_name ?? ""} ${last_name ?? ""}`.trim() || business_name || "";

    return `${debtorName} - ${referenceNumber}`;
  }

  private static getDebtorName(
    first_name?: string,
    last_name?: string,
    business_name?: string,
  ) {
    return (
      `${first_name ?? ""} ${last_name ?? ""}`.trim() || business_name || ""
    );
  }

  static async create(data: Partial<CollectionCaseCreate>, tenantId: string) {
    const parsedData = CollectionCaseCreateSchema.parse(data);

    if (parsedData.amount_original <= 0) {
      throw new Error("Amount original must be greater than zero");
    }

    const [tenant, parameter, debtor] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
      }),

      ParameterService.getParameter(),

      prisma.debtor.findUnique({
        where: {
          id: parsedData.debtor_id,
        },
        include: {
          person: true,
        },
      }),
    ]);

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!parameter) {
      throw new Error("Parameter not found");
    }

    if (!debtor) {
      throw new Error("Debtor not found");
    }

    const calculations = this.calculateAmounts(
      parsedData.amount_original,
      parameter,
    );

    const dueDate = await this.calculateDueDate(
      parsedData.status as CollectionCaseStatus,
      (debtor.person?.person_type as PersonType) || PersonType.INDIVIDUAL,
      parsedData.issue_date!,
    );

    const referenceNumber = await this.generateCollectionReference();

    const result = await prisma.$transaction(async (tx) => {
      const collectionCase = await tx.collectionCase.create({
        data: {
          debtor_id: parsedData.debtor_id,
          reference_number: referenceNumber,
          document_number: parsedData.document_number,
          issue_date: parsedData.issue_date,
          due_date: dueDate,
          amount_original: parsedData.amount_original,
          fee_rate: calculations.feeRate,
          fee_amount: calculations.feeAmount,
          abb_rate: calculations.abbRate,
          abb_amount: calculations.abbAmount,
          total_fined: 0,
          total_due: calculations.totalDue,
          total_to_receive: calculations.totalToReceive,
          total_paid: 0,
          balance: calculations.balance,
          status: parsedData.status,
          tenant_id: tenant.id,
        },
      });

      const debt = await tx.debt.create({
        data: {
          debtor_id: debtor.id,
          tenant_id: tenant.id,

          source_type: "COLLECTION_CASE",
          source_id: collectionCase.id,

          principal_amount: calculations.totalDue,
          status: "OPEN",
        },
      });

      await tx.collectionCase.update({
        where: {
          id: collectionCase.id,
        },
        data: {
          debt_id: debt.id,
        },
      });

      await tx.chatRoom.create({
        data: {
          tenant_id: tenant.id,
          collection_case_id: collectionCase.id,
          name: this.buildChatRoomName(
            debtor.person?.first_name || "",
            debtor.person?.last_name || "",
            debtor.person?.business_name || "",
            collectionCase.reference_number || "",
          ),
        },
      });

      return {
        collectionCase,
        debt,
      };
    });

    const totalWithTax = Number(
      (
        parsedData.amount_original +
        calculations.feeAmount +
        calculations.abbAmount
      ).toFixed(2),
    );

    // crear transaction sentoo
    const sentooResponse = await createSentooPayment({
      amount: totalWithTax,
      description: `Betaling voor aanmaning ${result.collectionCase.reference_number}`,
      reference: result.collectionCase.reference_number || "",
    });

    /**
     * Validar respuesta Sentoo
     */
    if (!sentooResponse?.success || !sentooResponse?.payment?.url) {
      throw new Error(
        sentooResponse?.error || "Kon de betaling niet aanmaken.",
      );
    }

    // 4. Registra el pago en la base de datos
    const paymentData: PaymentCreate = {
      debt_id: null, // No hay una deuda previa, este es un pago directo por activación
      method: "TRANSFER",
      total_amount: totalWithTax,
      paid_at: null,
      status: "pending",
      contract_id: null,
      provider: "sentoo",
      provider_ref: sentooResponse?.payment?.id,
      provider_payload: JSON.stringify(sentooResponse.raw),
      reference_number: result.collectionCase.reference_number || "",
      agreement_id: null,
      payment_type: "COLLECTION",
    };

    const paymentRes = await PaymentService.registerPayment(
      tenant.id,
      paymentData,
    );
    console.log("Payment registered in DB:", paymentRes);

    if (!paymentRes) {
      throw new Error("Kon de betaling niet registreren.");
    }

    const paymentUrl = sentooResponse.payment.url;

    try {
      await Promise.all([
        MailService.sendPaymentLinkEmail(
          tenant.contact_email,
          tenant.name,
          paymentUrl,
          calculations.feeAmount,
          result.collectionCase.reference_number || "",
        ),
        CollectionNotificationService.sendNotification(
          result.collectionCase.id,
        ),
      ]);
    } catch (error) {
      console.error("Post-create notification error", error);
    }

    return result.collectionCase;
  }

  static generateCollectionReference = async () => {
    const year = new Date().getFullYear();

    const total = await prisma.collectionCase.count();

    return `GOP-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static getAll = async (
    params: CollectionCaseFilter,
  ): Promise<CollectionCaseResponse[]> => {
    const collectionCases = await prisma.collectionCase.findMany({
      where: { ...params },
      orderBy: {
        created_at: "desc", // 👈 más reciente primero
      },
      include: {
        debtor: {
          include: {
            debts: true,
            person: true,
          },
        },
      },
    });

    return collectionCases.map((collection: any) => ({
      id: collection.id,
      reference_number: collection.reference_number || "",
      document_number: collection.document_number || "",
      issue_date: collection.issue_date,
      due_date: collection.due_date,
      tenant_id: collection.tenant_id,
      debtor_id: collection.debtor_id,
      amount_original: collection.amount_original.toNumber(),
      fee_rate: collection.fee_rate.toNumber(),
      fee_amount: collection.fee_amount.toNumber(),
      abb_rate: collection.abb_rate.toNumber(),
      abb_amount: collection.abb_amount.toNumber(),
      total_fined: collection.total_fined.toNumber(),
      total_due: collection.total_due.toNumber(),
      total_to_receive: collection.total_to_receive.toNumber(),
      total_paid: collection.total_paid.toNumber(),
      balance: collection.balance.toNumber(),
      status: collection.status as CollectionCaseStatus,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      debtor: {
        id: collection.debtor?.id ?? "",
        fullname:
          `${collection.debtor.person?.first_name ?? ""} ${
            collection.debtor.person?.last_name ?? ""
          }`.trim() ||
          collection.debtor.person?.business_name ||
          "",
        total_income: collection.debtor?.total_income || 0,
        email: collection.debtor?.email ?? "",
      },
    }));
  };
}
