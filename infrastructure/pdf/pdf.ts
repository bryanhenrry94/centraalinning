import ReactPDF from "@react-pdf/renderer";

export async function generatePdfBase64(
  template: React.JSX.Element
): Promise<string> {
  const stream = await ReactPDF.renderToStream(template);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);
  return buffer.toString("base64");
}
