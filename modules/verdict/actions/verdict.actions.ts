"use server";
import {
  VerdictCreate,
  VerdictResponse,
  VerdictUpdate,
} from "@/modules/verdict/services/verdict.validators";
import { VerdictInterestDetailCreate } from "@/modules/verdict/services/verdict-interest-details.validators";
import { VerdictAttachment } from "@/modules/verdict/services/verdict-attachments.validators";
import { protocol, rootDomain } from "@/lib/config";
import { notifyError } from "@/shared/ui/notifications";
import { VerdictService } from "@/modules/verdict/services/verdict.service";

export const getAllVerdicts = async (
  tenant_id: string,
  status?: string,
  debtor_id?: string,
): Promise<VerdictResponse[]> => {
  try {
    return VerdictService.getAll(tenant_id, status, debtor_id);
  } catch (error) {
    console.error("Error fetching all Verdicts:", error);
    throw new Error("Error fetching all Verdicts");
  }
};

export const getVerdictById = async (id: string): Promise<VerdictResponse | null> => {
  try {
    return VerdictService.getById(id);
  } catch (error) {
    console.error("Error fetching Verdict:", error);
    throw new Error("Error fetching Verdict");
  }
};

export const getAttachmentsByVerdictId = async (
  verdict_id: string,
): Promise<VerdictAttachment[]> => {
  try {
    return VerdictService.getAttachmentsByVerdictId(verdict_id);
  } catch (error) {
    console.error("Error fetching attachments by Verdict ID:", error);
    throw new Error("Error fetching attachments by Verdict ID");
  }
};

export const createVerdict = async (
  data: VerdictCreate,
  tenant_id: string,
): Promise<VerdictResponse | null> => {
  try {
    return VerdictService.create(data, tenant_id);
  } catch (error) {
    console.error("Error saving Verdict:", error);
    throw new Error("Error saving Verdict");
  }
};

export const updateVerdict = async (
  verdict_id: string,
  data: VerdictUpdate,
): Promise<VerdictResponse | null> => {
  try {
    return VerdictService.update(verdict_id, data);
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
  calculation_end: Date,
): Promise<VerdictInterestDetailCreate[]> => {
  try {
    return VerdictService.calculateInterestDetail(
      interest_type,
      base_amount,
      calculated_interest,
      calculation_start,
      calculation_end,
    );
  } catch {
    return [];
  }
};

export const deleteVerdict = async (id: string): Promise<boolean> => {
  try {
    return VerdictService.delete(id);
  } catch (error) {
    console.error("Error deleting Verdict:", error);
    throw new Error("Error deleting Verdict");
  }
};

export const handleSendMailNotificationBailiff = async (id: string): Promise<boolean> => {
  try {
    return VerdictService.sendMailNotificationBailiff(id);
  } catch (error) {
    console.error("Error sending mail notification:", error);
    return false;
  }
};

export const UploadAttachmentToVerdict = async (
  file: File,
  verdict_id: string,
  subdomain: string,
) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("verdict_id", verdict_id);

    const URL = `${protocol}://${rootDomain}/api/verdicts/upload`;

    const res = await fetch(URL, {
      method: "POST",
      body: fd,
      headers: { "x-tenant": subdomain },
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Fout bij het uploaden");

    if (!data.tenant) {
      notifyError("Geen organisatiegegevens gevonden");
      return;
    }

    await VerdictService.saveAttachment(verdict_id, {
      url: data.url,
      file_name: file.name,
      file_size: file.size,
    });

    return res.ok;
  } catch (error) {
    console.error("Error uploading file:", error);
    return false;
  }
};

export const approveVerdict = async (id: string): Promise<boolean> => {
  try {
    return VerdictService.approve(id);
  } catch (error) {
    console.error("Error approving verdict:", error);
    return false;
  }
};

export const requestVerdictApproval = async (id: string): Promise<boolean> => {
  try {
    return VerdictService.requestApproval(id);
  } catch {
    return false;
  }
};

export const DeleteVerdictAttachment = async (id: string): Promise<boolean> => {
  try {
    return VerdictService.deleteAttachment(id);
  } catch (error) {
    console.error("Error deleting verdict attachment:", error);
    return false;
  }
};

export const DownloadVerdictAttachment = async (
  id: string,
): Promise<{ success: boolean; file?: string; file_name?: string }> => {
  try {
    return VerdictService.downloadAttachment(id);
  } catch (error) {
    console.error("Error downloading verdict attachment:", error);
    return { success: false };
  }
};
