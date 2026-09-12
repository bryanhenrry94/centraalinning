import ReactPDF from "@react-pdf/renderer";

export async function generatePdfBuffer(
  template: React.JSX.Element
): Promise<Buffer> {
  const stream = await ReactPDF.renderToStream(template);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function generatePdfBase64(
  template: React.JSX.Element
): Promise<string> {
  const buffer = await generatePdfBuffer(template);
  return buffer.toString("base64");
}
