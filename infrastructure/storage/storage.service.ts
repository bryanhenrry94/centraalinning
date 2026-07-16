import { uploadFile } from "../storage/upload-file";
import { getFileUrl } from "../storage/get-file-url";
import { deleteFile } from "../storage/delete-file";
import { downloadFile } from "../storage/download-file";

export class StorageService {
  static async uploadDocumentXml(
    companyId: string,
    year: number,
    month: number,
    fileName: string,
    xmlBuffer: Buffer,
  ) {
    const key =
      `tenants/${companyId}` +
      `/documents/${year}/${month}` +
      `/${fileName}.xml`;

    await uploadFile({
      key,
      body: xmlBuffer,
      contentType: "application/xml",
    });

    return key;
  }

  static async uploadDocumentPdf(
    companyId: string,
    year: number,
    month: number,
    fileName: string,
    pdfBuffer: Buffer,
  ) {
    const key =
      `tenants/${companyId}` +
      `/documents/${year}/${month}` +
      `/${fileName}.pdf`;

    await uploadFile({
      key,
      body: pdfBuffer,
      contentType: "application/pdf",
    });

    return key;
  }

  static async uploadCertificate(companyId: string, buffer: Buffer) {
    const key = `tenants/${companyId}/certificates/certificate.pfx`;

    await uploadFile({
      key,
      body: buffer,
      contentType: "application/x-pkcs12",
    });

    return key;
  }

  static async uploadLogo(companyId: string, buffer: Buffer) {
    const key = `tenants/${companyId}/branding/logo.png`;

    await uploadFile({
      key,
      body: buffer,
      contentType: "image/png",
    });

    return key;
  }

  static async getDocumentUrl(key: string) {
    return getFileUrl(key);
  }

  static async removeDocument(key: string) {
    return deleteFile(key);
  }

  static async downloadFile(key: string): Promise<Uint8Array> {
    return downloadFile(key);
  }

  static async uploadFile(
    path: string,
    fileName: string,
    contentType: string,
    fileBuffer: Buffer,
  ) {
    const key = `${path}/${fileName}`;

    await uploadFile({
      key,
      body: fileBuffer,
      contentType: contentType,
    });

    return key;
  }
}
