import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Converts resume plain text into a PDF buffer using PDFKit.
 * The temp file is written to OS tmp dir and path returned.
 * Caller is responsible for deleting it after upload.
 */
export async function resumeTextToPdfFile(resumeText: string): Promise<string> {
  const buffer = await buildPdf(resumeText);
  const tmpPath = path.join(os.tmpdir(), `resume_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  await fs.writeFile(tmpPath, buffer);
  return tmpPath;
}

function buildPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data",  (chunk: Buffer) => chunks.push(chunk));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica").fontSize(10).text(text, {
      lineGap:   3,
      paragraphGap: 6,
    });

    doc.end();
  });
}
