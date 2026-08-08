import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import {
  VerdictResponse,
  VerdictUpdate,
} from "@/modules/verdict/services/verdict.validators";
import { VerdictInterestDetailCreate } from "@/modules/verdict/services/verdict-interest-details.validators";
import { VerdictAttachment } from "@/modules/verdict/services/verdict-attachments.validators";
import { InterestDetail } from "@/modules/settings/services/interest-type.validators";
import { InterestTypeService } from "@/modules/settings/services/interest-type.service";
import { sendVerdictApprovalEmail } from "@/modules/verdict/services/verdict-mail.service";

const mapVerdictResponse = (verdict: any): VerdictResponse => ({
  ...verdict,
  procesal_cost: verdict.procesal_cost === null ? undefined : verdict.procesal_cost,
  debtor: verdict.debtor
    ? {
        ...verdict.debtor,
        user_id: verdict.debtor.user_id === null ? null : verdict.debtor.user_id,
        email: verdict.debtor.email,
        person_id: verdict.debtor.person_id,
        fullname:
          verdict.debtor.person?.first_name && verdict.debtor.person?.last_name
            ? `${verdict.debtor.person.first_name} ${verdict.debtor.person.last_name}`
            : "Debtor",
        total_income:
          verdict.debtor.total_income === null ? undefined : verdict.debtor.total_income,
      }
    : verdict.debtor,
  verdict_interest: (verdict.verdict_interest ?? []).map((vi: any) => ({
    interest_type: vi.interest_type,
    base_amount: vi.base_amount,
    calculation_start: vi.calculation_start,
    calculation_end: vi.calculation_end,
    total_interest: vi.total_interest,
    details: vi.details,
    calculated_interest: vi.calculated_interest ?? undefined,
  })),
});

export class VerdictService {
  static async getAll(
    tenant_id: string,
    status?: string,
    debtor_id?: string,
  ): Promise<VerdictResponse[]> {
    const whereClause: any = { tenant_id };
    if (status) whereClause.status = status;
    if (debtor_id) whereClause.debtor_id = debtor_id;

    const verdicts = await prisma.verdict.findMany({
      where: whereClause,
      include: {
        debtor: { include: { person: true } },
        verdict_embargo: true,
        verdict_interest: { include: { details: true } },
      },
    });

    return verdicts.map(mapVerdictResponse);
  }

  static async getById(id: string): Promise<VerdictResponse | null> {
    const verdict = await prisma.verdict.findUnique({
      where: { id },
      include: {
        debtor: { include: { person: true } },
        verdict_embargo: true,
        verdict_interest: { include: { details: true } },
        attachments: true,
        bailiff_services: true,
      },
    });

    if (!verdict) return null;
    return mapVerdictResponse(verdict);
  }

  static async getAttachmentsByVerdictId(verdict_id: string): Promise<VerdictAttachment[]> {
    return prisma.verdictAttachment.findMany({ where: { verdict_id } });
  }

  static async update(verdict_id: string, data: VerdictUpdate): Promise<VerdictResponse | null> {
    const updatedVerdict = await prisma.$transaction(async (tx: any) => {
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
          bailiff_id: data.bailiff_id,
        },
      });

      if (data.verdict_interest) {
        const verdictInterestIds = (
          await tx.verdictInterest.findMany({
            where: { verdict_id },
            select: { id: true },
          })
        ).map((vi: any) => vi.id);

        await tx.verdictInterestDetails.deleteMany({
          where: { verdict_interest_id: { in: verdictInterestIds } },
        });

        await tx.verdictInterest.deleteMany({ where: { verdict_id } });

        for (const item of data.verdict_interest) {
          const verdict_interest = await tx.verdictInterest.create({
            data: {
              interest_type: item.interest_type,
              base_amount: item.base_amount,
              calculated_interest: item.calculated_interest,
              calculation_start: item.calculation_start,
              calculation_end: item.calculation_end,
              total_interest: item.total_interest,
              verdict_id,
            },
          });

          await tx.verdictInterestDetails.createMany({
            data: item.details.map((detail: any) => ({
              ...detail,
              verdict_interest_id: verdict_interest.id,
            })),
          });
        }
      }

      if (data.verdict_embargo) {
        const verdictEmbargoIds = (
          await tx.verdictEmbargo.findMany({
            where: { verdict_id },
            select: { id: true },
          })
        ).map((vi: any) => vi.id);

        await tx.verdictEmbargo.deleteMany({ where: { id: { in: verdictEmbargoIds } } });

        for (const item of data.verdict_embargo) {
          await tx.verdictEmbargo.create({
            data: {
              verdict_id,
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
        await tx.verdictBailiffServices.deleteMany({ where: { verdict_id } });
        for (const item of data.bailiff_services) {
          await tx.verdictBailiffServices.create({ data: { ...item, verdict_id } });
        }
      }

      return verdict;
    });

    return this.getById(updatedVerdict.id);
  }

  static async delete(id: string): Promise<boolean> {
    return prisma.$transaction(async (tx: any) => {
      const verdictInterestIds = (
        await tx.verdictInterest.findMany({ where: { verdict_id: id }, select: { id: true } })
      ).map((vi: any) => vi.id);

      await tx.verdictInterestDetails.deleteMany({
        where: { verdict_interest_id: { in: verdictInterestIds } },
      });

      await tx.verdictInterest.deleteMany({ where: { verdict_id: id } });

      const verdictEmbargoIds = (
        await tx.verdictEmbargo.findMany({ where: { verdict_id: id }, select: { id: true } })
      ).map((vi: any) => vi.id);

      await tx.verdictEmbargo.deleteMany({ where: { id: { in: verdictEmbargoIds } } });
      await tx.verdict.delete({ where: { id } });

      return true;
    });
  }

  static async sendMailNotificationBailiff(id: string): Promise<boolean> {
    const verdict = await prisma.verdict.findUnique({
      where: { id },
      include: { tenant: true, bailiff: true },
    });

    if (!verdict || !verdict.id) return false;
    if (!verdict.bailiff?.email) return false;

    await sendVerdictApprovalEmail(
      verdict.bailiff.email,
      verdict.bailiff.fullname || "Bailiff",
      verdict.id,
    );

    return false;
  }

  static async saveAttachment(
    verdict_id: string,
    data: { url: string; file_name: string; file_size: number },
  ) {
    return prisma.verdictAttachment.create({
      data: {
        verdict_id,
        file_path: data.url,
        file_name: data.file_name,
        file_size: data.file_size,
      },
    });
  }

  static async deleteAttachment(id: string): Promise<boolean> {
    const attachment = await prisma.verdictAttachment.findUnique({ where: { id } });
    if (!attachment) return false;

    const absoluteFilePath = path.join(process.cwd(), "public", attachment.file_path);
    try {
      await fs.unlink(absoluteFilePath);
    } catch {
      // continue even if file delete fails
    }

    await prisma.verdictAttachment.delete({ where: { id } });
    return true;
  }

  static async downloadAttachment(
    id: string,
  ): Promise<{ success: boolean; file?: string; file_name?: string }> {
    const attachment = await prisma.verdictAttachment.findUnique({ where: { id } });
    if (!attachment) return { success: false };

    const absoluteFilePath = path.join(process.cwd(), "public", attachment.file_path);

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(absoluteFilePath);
    } catch {
      return { success: false };
    }

    return { success: true, file: fileBuffer.toString("base64"), file_name: attachment.file_name };
  }

  static async calculateInterestDetail(
    interest_type: string,
    base_amount: number,
    calculated_interest: number,
    calculation_start: Date,
    calculation_end: Date,
  ): Promise<VerdictInterestDetailCreate[]> {
    if (!interest_type || base_amount === 0 || !calculation_start || !calculation_end) return [];

    const objInterestType = await InterestTypeService.getById(interest_type);
    if (!objInterestType) return [];

    let fechaInicio =
      calculation_start instanceof Date ? calculation_start : new Date(calculation_start);
    const fechaFinCalculo =
      calculation_end instanceof Date ? calculation_end : new Date(calculation_end);

    let montoCalculo = base_amount;

    const details: InterestDetail[] = (objInterestType.details || [])
      .slice()
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let tramoIndex = 1;
    const verdictInterestDetails: VerdictInterestDetailCreate[] = [];

    while (fechaInicio < fechaFinCalculo && montoCalculo > 0) {
      const objInteresDetalle = details.find((det) => new Date(det.date) > fechaInicio);
      let tasaAnual = 0;
      let fechaFinTramo: Date;

      if (!objInteresDetalle) {
        const prevDetalles = details.filter((det) => new Date(det.date) <= fechaInicio);
        const lastPrevDetalle =
          prevDetalles.length > 0
            ? prevDetalles[prevDetalles.length - 1]
            : details[details.length - 1];
        tasaAnual = lastPrevDetalle?.rate ?? 0;
        fechaFinTramo = new Date(fechaFinCalculo);
      } else {
        const prevDetalles = details.filter((det) => new Date(det.date) <= new Date(fechaInicio));
        const lastPrevDetalle =
          prevDetalles.length > 0 ? prevDetalles[prevDetalles.length - 1] : details[0];
        tasaAnual = lastPrevDetalle?.rate ?? 0;
        fechaFinTramo = new Date(objInteresDetalle.date);
        if (fechaFinTramo > fechaFinCalculo) fechaFinTramo = new Date(fechaFinCalculo);
      }

      const dias = Math.ceil(
        (fechaFinTramo.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24),
      );
      const proporcional = (tasaAnual / 365) * dias;
      const calc_interest = base_amount * Math.pow(1 + proporcional / 100, 1) - base_amount;
      const total = base_amount + calc_interest;

      verdictInterestDetails.push({
        period: `#${tramoIndex}`,
        period_start: fechaInicio,
        period_end: fechaFinTramo,
        days: dias,
        annual_rate: tasaAnual,
        proportional_rate: proporcional,
        base_amount: Math.round(base_amount * 100) / 100,
        interest: Math.round(calc_interest * 100) / 100,
        total: Math.round(total * 100) / 100,
      });

      montoCalculo = total;
      fechaInicio = fechaFinTramo;
      tramoIndex++;
    }

    return verdictInterestDetails;
  }
}
