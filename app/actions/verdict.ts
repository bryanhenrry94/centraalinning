"use server";
import prisma from "@/lib/prisma";
import {
  VerdictCreate,
  VerdictResponse,
  VerdictUpdate,
} from "@/lib/validations/verdict";
import { VerdictInterestDetailCreate } from "@/lib/validations/verdict-interest-details";
import { InterestDetail } from "@/lib/validations/interest-type";
import { getInterestTypeById } from "@/app/actions/interest-type";
import { notifyError } from "@/lib/notifications";
import { protocol, rootDomain } from "@/lib/config";
import path from "path";
import fs from "fs/promises";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { VerdictAttachment } from "@/lib/validations/verdict-attachments";
import { $Enums } from "@/prisma/generated/prisma";
import {
  sendInvoiceEmail,
  sendMailRegisterVerdict,
  sendMailVerdictCreditor,
  sendMailVerdictDebtor,
  sendVerdictApprovalEmail,
} from "./email";
import { createInvoice, generateInvoiceNumber } from "./billing-invoice";
import { BillingInvoiceCreate } from "@/lib/validations/billing-invoice";
import { BillingInvoiceDetailCreate } from "@/lib/validations/billing-invoice-detail";
import { InvoicePDFProps } from "@/templates/pdfs";
import { getParameter } from "./parameter";
import { VerdictDebtorPDFProps } from "@/templates/pdfs/VerdictDebtorPDF";
import { VerdictCreditorPDFProps } from "@/templates/pdfs/VerdictCreditorPDF";

export const getAllVerdicts = async (
  tenant_id: string
): Promise<VerdictResponse[]> => {
  try {
    const verdicts = await prisma.verdict.findMany({
      where: {
        tenant_id,
      },
      include: {
        debtor: true,
        verdict_embargo: true,
        verdict_interest: {
          include: {
            details: true,
          },
        },
      },
    });

    // Map the verdicts to match the VerdictResponse type
    const mappedVerdicts: VerdictResponse[] = verdicts.map((verdict) => ({
      ...verdict,
      procesal_cost:
        verdict.procesal_cost === null ? undefined : verdict.procesal_cost,
      debtor: verdict.debtor
        ? {
            ...verdict.debtor,
            user_id:
              verdict.debtor.user_id === null
                ? undefined
                : verdict.debtor.user_id,
            phone:
              verdict.debtor.phone === null ? undefined : verdict.debtor.phone,
            address:
              verdict.debtor.address === null
                ? undefined
                : verdict.debtor.address,
            person_type:
              verdict.debtor.person_type === null
                ? "INDIVIDUAL"
                : (verdict.debtor.person_type as $Enums.PersonType),
            identification_type:
              verdict.debtor.identification_type === null
                ? "OTHER"
                : (verdict.debtor
                    .identification_type as $Enums.IdentificationType),
            identification:
              verdict.debtor.identification === null
                ? undefined
                : verdict.debtor.identification,
            total_income:
              verdict.debtor.total_income === null
                ? undefined
                : verdict.debtor.total_income,
          }
        : verdict.debtor,
      verdict_interest: verdict.verdict_interest.map((vi) => ({
        interest_type: vi.interest_type,
        base_amount: vi.base_amount,
        calculation_start: vi.calculation_start,
        calculation_end: vi.calculation_end,
        total_interest: vi.total_interest,
        details: vi.details,
        calculated_interest: vi.calculated_interest ?? undefined,
      })),
    }));

    return mappedVerdicts;
  } catch (error) {
    console.error("Error fetching all Verdicts:", error);
    throw new Error("Error fetching all Verdicts");
  }
};

export const getVerdictById = async (
  id: string
): Promise<VerdictResponse | null> => {
  try {
    const verdict = await prisma.verdict.findUnique({
      where: { id },
      include: {
        debtor: true,
        verdict_embargo: true,
        verdict_interest: {
          include: {
            details: true,
          },
        },
        attachments: true,
        bailiff_services: true,
      },
    });

    // Map the verdicts to match the VerdictResponse type
    if (!verdict) return null;
    return {
      ...verdict,
      procesal_cost: verdict.procesal_cost ?? undefined,
      sentence_date: verdict.sentence_date,
      debtor: verdict.debtor
        ? {
            ...verdict.debtor,
            user_id:
              verdict.debtor.user_id === null
                ? undefined
                : verdict.debtor.user_id,
            phone:
              verdict.debtor.phone === null ? undefined : verdict.debtor.phone,
            address:
              verdict.debtor.address === null
                ? undefined
                : verdict.debtor.address,
            person_type:
              verdict.debtor.person_type === null
                ? undefined
                : (verdict.debtor.person_type as "INDIVIDUAL" | "COMPANY"),
            identification_type:
              verdict.debtor.identification_type === null
                ? "OTHER"
                : (verdict.debtor.identification_type as
                    | "DNI"
                    | "PASSPORT"
                    | "NIE"
                    | "CIF"
                    | "KVK"
                    | "OTHER"),
            identification:
              verdict.debtor.identification === null
                ? undefined
                : verdict.debtor.identification,
            total_income:
              verdict.debtor.total_income === null
                ? undefined
                : verdict.debtor.total_income,
          }
        : verdict.debtor,
      verdict_interest: verdict.verdict_interest.map((vi) => ({
        interest_type: vi.interest_type,
        base_amount: vi.base_amount,
        calculation_start: vi.calculation_start,
        calculation_end: vi.calculation_end,
        total_interest: vi.total_interest,
        details: vi.details,
        calculated_interest: vi.calculated_interest ?? undefined,
      })),
    };
  } catch (error) {
    console.error("Error fetching all Verdicts:", error);
    throw new Error("Error fetching all Verdicts");
  }
};

export const getAttachmentsByVerdictId = async (
  verdict_id: string
): Promise<VerdictAttachment[]> => {
  try {
    const attachments = await prisma.verdictAttachment.findMany({
      where: { verdict_id },
    });
    return attachments;
  } catch (error) {
    console.error("Error fetching attachments by Verdict ID:", error);
    throw new Error("Error fetching attachments by Verdict ID");
  }
};

export const createVerdict = async (
  data: VerdictCreate,
  tenant_id: string
): Promise<VerdictResponse | null> => {
  try {
    console.log("iniciando transaccion verdict");
    // initialize transaction
    const createdVerdict = await prisma.$transaction(async (tx) => {
      // create new verdict
      const newVerdict = await tx.verdict.create({
        data: {
          invoice_number: data.invoice_number,
          creditor_name: data.creditor_name,
          debtor_id: data.debtor_id,
          registration_number: data.registration_number,
          sentence_amount: data.sentence_amount,
          sentence_date: data.sentence_date,
          procesal_cost: data.procesal_cost,
          bailiff_id: data.bailiff_id ?? null,
          tenant_id: tenant_id,
        },
      });

      // if verdict interest exists
      if (data.verdict_interest) {
        for (const item of data.verdict_interest) {
          // create verdict interest
          const verdict_interest = await tx.verdictInterest.create({
            data: {
              interest_type: item.interest_type,
              base_amount: item.base_amount,
              calculated_interest: item.calculated_interest,
              calculation_start: item.calculation_start,
              calculation_end: item.calculation_end,
              total_interest: item.total_interest,
              verdict_id: newVerdict.id,
            },
          });

          // create verdict interest details
          await tx.verdictInterestDetails.createMany({
            data: item.details.map((detail) => ({
              ...detail,
              verdict_interest_id: verdict_interest.id,
            })),
          });
        }
      }

      // if verdict embargo exists
      if (data.verdict_embargo) {
        for (const item of data.verdict_embargo) {
          // create verdict embargo
          await tx.verdictEmbargo.create({
            data: {
              verdict_id: newVerdict.id,
              company_name: item.company_name,
              company_phone: item.company_phone,
              company_email: item.company_email,
              company_address: item.company_address,
              embargo_type: item.embargo_type,
              embargo_date: item.embargo_date,
              embargo_amount: item.embargo_amount,
              total_amount: item.total_amount,
            },
          });
        }
      }

      const params = {
        to: data.creditor_name,
        verdictReference: newVerdict.registration_number,
        verdictDate: formatDate(newVerdict.sentence_date.toISOString()),
      };

      // notify register verdict via email
      await sendMailRegisterVerdict(params);

      // set verdict status to PENDING
      await prisma.verdict.update({
        where: { id: newVerdict.id },
        data: { status: "PENDING" },
      });

      // send email to bailiff for approval
      const bailiff = await tx.bailiff.findUnique({
        where: { id: newVerdict.bailiff_id ?? "" },
      });

      if (bailiff?.email) {
        await sendVerdictApprovalEmail(
          bailiff.email,
          bailiff.fullname || "Bailiff",
          createdVerdict.id
        );
      }

      return newVerdict;
    });

    if (createdVerdict) {
      return getVerdictById(createdVerdict.id);
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error saving Verdict:", error);
    throw new Error("Error saving Verdict");
  }
};

export const updateVerdict = async (
  verdict_id: string,
  data: VerdictUpdate
): Promise<VerdictResponse | null> => {
  try {
    console.log("updateVerdict ID: ", verdict_id);
    console.log("updateVerdict Data: ", data);

    const updatedVerdict = await prisma.$transaction(async (tx) => {
      const verdict = await prisma.verdict.update({
        where: { id: verdict_id },
        data: {
          invoice_number: data.invoice_number,
          creditor_name: data.creditor_name,
          debtor_id: data.debtor_id,
          registration_number: data.registration_number,
          sentence_amount: data.sentence_amount,
          sentence_date: data.sentence_date,
          procesal_cost: data.procesal_cost,
          bailiff_id: data.bailiff_id ?? null,
        },
      });

      console.log("Verdict updated, now updating related data...");

      // if verdict interest exists
      if (data.verdict_interest) {
        // elimina los detalles de interest
        // Obtener los IDs de los verdictInterest relacionados a este veredicto
        const verdictInterestIds = (
          await tx.verdictInterest.findMany({
            where: { verdict_id: verdict_id },
            select: { id: true },
          })
        ).map((vi) => vi.id);

        // Eliminar los detalles relacionados a esos verdict_interest
        await tx.verdictInterestDetails.deleteMany({
          where: {
            verdict_interest_id: {
              in: verdictInterestIds,
            },
          },
        });

        // Eliminar los intereses existentes relacionados al veredicto
        await tx.verdictInterest.deleteMany({
          where: { verdict_id: verdict_id },
        });

        for (const item of data.verdict_interest) {
          // create verdict interest
          const verdict_interest = await tx.verdictInterest.create({
            data: {
              interest_type: item.interest_type,
              base_amount: item.base_amount,
              calculated_interest: item.calculated_interest,
              calculation_start: item.calculation_start,
              calculation_end: item.calculation_end,
              total_interest: item.total_interest,
              verdict_id: verdict_id,
            },
          });

          // create verdict interest details
          await tx.verdictInterestDetails.createMany({
            data: item.details.map((detail) => ({
              ...detail,
              verdict_interest_id: verdict_interest.id,
            })),
          });
        }
      }

      // if verdict embargo exists
      if (data.verdict_embargo) {
        // elimina los detalles de embargo
        const verdictEmbargoIds = (
          await tx.verdictEmbargo.findMany({
            where: { verdict_id: verdict_id },
            select: { id: true },
          })
        ).map((vi) => vi.id);

        await tx.verdictEmbargo.deleteMany({
          where: {
            id: {
              in: verdictEmbargoIds,
            },
          },
        });

        for (const item of data.verdict_embargo) {
          // create verdict embargo
          await tx.verdictEmbargo.create({
            data: {
              verdict_id: verdict_id,
              company_name: item.company_name,
              company_phone: item.company_phone,
              company_email: item.company_email,
              company_address: item.company_address,
              embargo_type: item.embargo_type,
              embargo_date: item.embargo_date,
              embargo_amount: item.embargo_amount,
              total_amount: item.total_amount,
            },
          });
        }
      }

      if (data.bailiff_services) {
        await tx.verdictBailiffServices.deleteMany({
          where: { verdict_id: verdict_id },
        });

        for (const item of data.bailiff_services) {
          await tx.verdictBailiffServices.create({
            data: {
              ...item,
              verdict_id: verdict_id,
            },
          });
        }
      }

      return verdict;
    });

    return await getVerdictById(updatedVerdict.id);
  } catch (error) {
    console.error("Error updating Verdict:", error);
    throw new Error("Error updating Verdict");
  }
};

export const calculateInterestDetail = async (
  interest_type: string,
  base_amount: number,
  calculated_interest: number,
  calculation_start: Date,
  calculation_end: Date
): Promise<VerdictInterestDetailCreate[]> => {
  try {
    const verdictInterestDetails: VerdictInterestDetailCreate[] = [];

    // Validar los parámetros de entrada
    if (
      interest_type === "" ||
      base_amount === 0 ||
      !calculation_start ||
      !calculation_end
    ) {
      return [];
    }

    // obtener el tipo de interés
    const objInterestType = await getInterestTypeById(interest_type);

    if (!objInterestType) {
      return [];
    }

    // Asegurarse de que calculation_start y calculation_end sean Date
    let fechaInicio =
      calculation_start instanceof Date
        ? calculation_start
        : new Date(calculation_start);
    const fechaFinCalculo =
      calculation_end instanceof Date
        ? calculation_end
        : new Date(calculation_end);

    let montoCalculo = base_amount;

    // Ordenar los details por fecha ascendente
    const details: InterestDetail[] = (objInterestType.details || [])
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let tramoIndex = 1;

    while (fechaInicio < fechaFinCalculo && montoCalculo > 0) {
      // Buscar el detalle aplicable para la fecha actual
      const objInteresDetalle = details.find(
        (det) => new Date(det.date) > fechaInicio
      );
      let tasaAnual = 0;
      let fechaFinTramo: Date;

      if (!objInteresDetalle) {
        // Si no hay un detalle futuro, usar la tasa del último detalle anterior a la fecha fin ingresada
        const prevDetalles = details.filter(
          (det) => new Date(det.date) <= fechaInicio
        );
        const lastPrevDetalle =
          prevDetalles.length > 0
            ? prevDetalles[prevDetalles.length - 1]
            : details[details.length - 1];
        tasaAnual = lastPrevDetalle?.rate ?? 0;
        fechaFinTramo = new Date(fechaFinCalculo);
      } else {
        // Buscar el último detalle menor o igual a la fecha actual
        const prevDetalles = details.filter(
          (det) => new Date(det.date) <= new Date(fechaInicio)
        );
        const lastPrevDetalle =
          prevDetalles.length > 0
            ? prevDetalles[prevDetalles.length - 1]
            : details[0];
        tasaAnual = lastPrevDetalle?.rate ?? 0;
        fechaFinTramo = new Date(objInteresDetalle.date);
        // El tramo no puede pasar de la fecha fin de cálculo
        if (fechaFinTramo > fechaFinCalculo) {
          fechaFinTramo = new Date(fechaFinCalculo);
        }
      }

      // Calcular días del tramo
      const dias: number = Math.ceil(
        (fechaFinTramo.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24)
      );

      const proporcional = (tasaAnual / 365) * dias;

      // Interés compuesto: base_amount * (1 + proporcional/100) - base_amount
      const calculated_interest =
        base_amount * Math.pow(1 + proporcional / 100, 1) - base_amount;

      const total = base_amount + calculated_interest;

      const detalle: VerdictInterestDetailCreate = {
        period: `#${tramoIndex}`,
        period_start: fechaInicio,
        period_end: fechaFinTramo,
        days: dias,
        annual_rate: tasaAnual,
        proportional_rate: proporcional,
        base_amount: Math.round(base_amount * 100) / 100,
        interest: Math.round(calculated_interest * 100) / 100,
        total: Math.round(total * 100) / 100,
      };

      verdictInterestDetails.push(detalle);

      // Actualizar base_amount para el siguiente tramo (interés compuesto)
      montoCalculo = total;
      fechaInicio = fechaFinTramo;
      tramoIndex++;
    }

    return verdictInterestDetails;
  } catch (error) {
    return [];
  }
};

export const deleteVerdict = async (id: string): Promise<boolean> => {
  try {
    return await prisma.$transaction(async (tx) => {
      const verdictInterestIds = (
        await tx.verdictInterest.findMany({
          where: { verdict_id: id },
          select: { id: true },
        })
      ).map((vi) => vi.id);

      // Eliminar los detalles relacionados a esos verdict_interest
      await tx.verdictInterestDetails.deleteMany({
        where: {
          verdict_interest_id: {
            in: verdictInterestIds,
          },
        },
      });

      // Eliminar los intereses existentes relacionados al veredicto
      await tx.verdictInterest.deleteMany({
        where: { verdict_id: id },
      });

      const verdictEmbargoIds = (
        await tx.verdictEmbargo.findMany({
          where: { verdict_id: id },
          select: { id: true },
        })
      ).map((vi) => vi.id);

      await tx.verdictEmbargo.deleteMany({
        where: {
          id: {
            in: verdictEmbargoIds,
          },
        },
      });

      await tx.verdict.delete({
        where: { id },
      });

      return true;
    });
  } catch (error) {
    console.error("Error deleting Verdict:", error);
    throw new Error("Error deleting Verdict");
  }
};

export const handleSendMailNotificationBailiff = async (
  id: string
): Promise<boolean> => {
  try {
    const createdVerdict = await prisma.verdict.findUnique({
      where: { id },
      include: { tenant: true, bailiff: true },
    });

    if (!createdVerdict) return false;
    if (!createdVerdict.id) return false;

    if (!createdVerdict.bailiff?.email) {
      console.log("No bailiff email found for verdict id:", createdVerdict.id);
      return false;
    }

    await sendVerdictApprovalEmail(
      createdVerdict.bailiff.email,
      createdVerdict.bailiff.fullname || "Bailiff",
      createdVerdict.id
    );

    return false;
  } catch (error) {
    console.error("Error sending mail notification:", error);
    return false;
  }
};

export const UploadAttachmentToVerdict = async (
  file: File,
  verdict_id: string,
  subdomain: string
) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("verdict_id", verdict_id);

    const URL = `${protocol}://${rootDomain}/api/verdicts/upload`;

    // Sube el archivo a /public/verdicts con el nombre del veredicto
    // Si estamos en desarrollo, ignorar certificados SSL inválidos
    const fetchOptions: RequestInit = {
      method: "POST",
      body: fd,
      headers: {
        "x-tenant": subdomain, // TODO: cambiar esto cuando haya multi-tenant
      },
    };

    console.log("Uploading file to:", URL);

    const res = await fetch(URL, fetchOptions);

    const data = await res.json();

    console.log("File upload response:", data);

    if (!res.ok) throw new Error(data?.error || "Error al subir");

    if (!data.tenant) {
      // Si no hay datos del inquilino, no se puede actualizar
      notifyError("No se encontraron datos del inquilino");
      return;
    }

    // Actualiza la ruta del archivo en la base de datos
    await prisma.verdictAttachment.create({
      data: {
        verdict_id,
        file_path: data.url,
        file_name: file.name,
        file_size: file.size,
      },
    });

    return res.ok;
  } catch (error) {
    console.error("Error uploading file:", error);
    return false;
  }
};

export const approveVerdict = async (id: string): Promise<boolean> => {
  try {
    const VerdictUpdated = await prisma.verdict.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    const parameter = await getParameter();

    if (!parameter) {
      console.error("Parameter not found");
      return false;
    }

    // Generar número de factura único
    const invoice_number = await generateInvoiceNumber();

    const cost_service = 40; // costo fijo de servicio, traer del parametro
    const base_amount = VerdictUpdated.sentence_amount * 0.1;

    const amount = base_amount + cost_service; // Monto fijo por ahora
    const tax_rate = parameter.abb_rate; // 6% de IVA
    const tax_amount = (amount * tax_rate) / 100;
    const total_with_tax = amount + tax_amount;

    const details: BillingInvoiceDetailCreate[] = [
      {
        item_description: `Registratiekosten vonnis ${VerdictUpdated.registration_number}`,
        item_quantity: 1,
        item_unit_price: amount,
        item_total_price: amount,
        item_tax_rate: tax_rate,
        item_tax_amount: tax_amount,
        item_total_with_tax: total_with_tax,
      },
    ];

    const invoice: BillingInvoiceCreate = {
      invoice_number: invoice_number,
      issue_date: new Date(),
      due_date: new Date(),
      description: `Factuur voor vonnis ${VerdictUpdated.registration_number}`,
      status: "unpaid",
      tenant_id: VerdictUpdated.tenant_id,
      currency: "USD",
      amount: 90,
      invoice_details: details,
    };

    // Crear la factura en la base de datos
    const invoiceCreated = await createInvoice(
      invoice,
      VerdictUpdated.tenant_id
    );

    // cliente del veredicto
    const tenant = await prisma.tenant.findUnique({
      where: { id: VerdictUpdated.tenant_id },
    });

    if (!tenant) {
      console.error("Tenant not found for verdict id:", id);
      return false;
    }

    const debtor = await prisma.debtor.findUnique({
      where: { id: VerdictUpdated.debtor_id },
      include: { tenant: true },
    });

    if (!debtor) {
      console.error("Debtor not found for verdict id:", id);
      return false;
    }

    // const verdictCreditorData: VerdictCreditorPDFProps = {
    //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
    //   invoice_number: invoiceCreated.invoice_number,
    //   creditor_name: debtor.tenant?.name || "Creditor",
    //   debtorName: debtor.fullname || "Debtor",
    //   date: invoiceCreated.issue_date
    //     ? formatDate(invoiceCreated.issue_date.toString())
    //     : formatDate(new Date().toISOString()),
    //   total_amount: formatCurrency(invoiceCreated.amount),
    //   reference_number: VerdictUpdated.registration_number || "Reference",
    // };

    // Datos de ejemplo para el PDF de la factura
    // const invoiceData: InvoicePDFProps = {
    //   logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
    //   invoice_number: invoiceCreated.invoice_number,
    //   issue_date: formatDate(invoiceCreated.issue_date.toString()),
    //   customer_name: debtor.fullname,
    //   customer_address: debtor.address || "",
    //   customer_island: debtor.tenant?.country_code || "",
    //   details: [
    //     {
    //       item_description: "Servicekosten",
    //       item_quantity: 1,
    //       item_unit_price: amount,
    //       item_tax_rate: tax_rate,
    //       item_subtotal: total_with_tax,
    //     },
    //   ],
    //   total: total_with_tax,
    //   bank_name: parameter.bank_name,
    //   bank_account: parameter.bank_account,
    // };

    // Si no viene de sistema se debe cobrar el 10% de servicio.
    await sendInvoiceEmail(
      debtor.tenant?.contact_email || "",
      invoiceCreated.id
    );

    // Enviar notificación al acreedor y deudor
    // await sendMailVerdictCreditor(
    //   tenant.contact_email,
    //   verdictCreditorData,
    //   invoiceData
    // );

    const verdictDebtorData: VerdictDebtorPDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      debtorName: debtor.fullname || "Debtor",
      reference: VerdictUpdated.registration_number || "Reference",
      sentence_date: formatDate(
        VerdictUpdated.sentence_date
          ? VerdictUpdated.sentence_date.toISOString()
          : new Date().toISOString()
      ),
      sentence_amount: VerdictUpdated.sentence_amount
        ? VerdictUpdated.sentence_amount.toFixed(2)
        : "0.00",
      bankAccountNumber: parameter.bank_account,
      date: formatDate(new Date().toISOString()),
    };

    await sendMailVerdictDebtor(debtor.email, verdictDebtorData);

    return VerdictUpdated ? true : false;
  } catch (error) {
    console.error("Error approving verdict:", error);
    return false;
  }
};

export const requestVerdictApproval = async (id: string): Promise<boolean> => {
  try {
    const response = await prisma.verdict.update({
      where: { id },
      data: { status: "PENDING" },
    });

    return response ? true : false;
  } catch (error) {
    return false;
  }
};

export const DeleteVerdictAttachment = async (id: string): Promise<boolean> => {
  try {
    // Buscar el attachment en la base de datos
    const attachment = await prisma.verdictAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      console.error("Attachment not found with id:", id);
      return false;
    }

    // Construir la ruta absoluta del archivo
    const absoluteFilePath = path.join(
      process.cwd(),
      "public",
      attachment.file_path
    );

    // Eliminar el archivo del sistema de archivos
    try {
      await fs.unlink(absoluteFilePath);
      console.log("Archivo eliminado:", absoluteFilePath);
    } catch (fsError) {
      console.error("Error deleting file from filesystem:", fsError);
      // Continuar incluso si hay un error al eliminar el archivo
    }

    // Eliminar el registro del attachment en la base de datos
    await prisma.verdictAttachment.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error("Error deleting verdict attachment:", error);
    return false;
  }
};

export const DownloadVerdictAttachment = async (
  id: string
): Promise<{ success: boolean; file?: string; file_name?: string }> => {
  try {
    // Buscar el attachment en la base de datos
    const attachment = await prisma.verdictAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      console.error("Attachment not found with id:", id);
      return { success: false };
    }

    // Construir la ruta absoluta del archivo
    const absoluteFilePath = path.join(
      process.cwd(),
      "public",
      attachment.file_path
    );

    console.log("Attempting to read file at:", absoluteFilePath);

    // Verificar si el archivo existe y leerlo
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(absoluteFilePath);
    } catch (fsError) {
      console.error("File does not exist on filesystem:", fsError);
      return { success: false };
    }

    // Convert Buffer to base64 string for safe transfer to client
    const fileBase64 = fileBuffer.toString("base64");

    return {
      success: true,
      file: fileBase64,
      file_name: attachment.file_name,
    };
  } catch (error) {
    console.error("Error downloading verdict attachment:", error);
    return { success: false };
  }
};
