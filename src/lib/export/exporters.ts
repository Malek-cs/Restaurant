import "server-only";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { currencyDigits } from "@/utils/money";
import type { ExportDataset, ExportFormat } from "./types";

export interface ExportFile {
  buffer: Buffer | Uint8Array;
  contentType: string;
  extension: string;
}

/** Spreadsheet apps execute cells beginning with = + - @ as formulas. Neutralise them. */
function safeText(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
}

function cellValue(col: { type?: string }, v: string | number | null | undefined, digits: number) {
  if (v == null || v === "") return "";
  if (col.type === "money" && typeof v === "number") return (v / 10 ** digits).toFixed(digits);
  return safeText(v);
}

export function toCsv(ds: ExportDataset): ExportFile {
  const digits = currencyDigits(ds.currency);
  const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [ds.columns.map((c) => esc(c.header)).join(",")];
  for (const row of ds.rows) lines.push(ds.columns.map((c) => esc(cellValue(c, row[c.key], digits))).join(","));
  // BOM so Excel opens UTF-8 (Arabic names) correctly
  return { buffer: Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8"), contentType: "text/csv; charset=utf-8", extension: "csv" };
}

export async function toXlsx(ds: ExportDataset): Promise<ExportFile> {
  const digits = currencyDigits(ds.currency);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Lumière Restaurant OS";
  const ws = wb.addWorksheet(ds.title.slice(0, 30));
  ws.columns = ds.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 4) }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF30372A" } };
  header.alignment = { vertical: "middle" };
  for (const row of ds.rows) {
    const values: Record<string, string | number> = {};
    for (const c of ds.columns) {
      const v = row[c.key];
      if (v == null) values[c.key] = "";
      else if (c.type === "money" && typeof v === "number") values[c.key] = v / 10 ** digits;
      else if (c.type === "number" && typeof v === "number") values[c.key] = v;
      else values[c.key] = safeText(v);
    }
    ws.addRow(values);
  }
  ds.columns.forEach((c, i) => {
    if (c.type === "money") ws.getColumn(i + 1).numFmt = `#,##0.${"0".repeat(digits)}`;
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buf as ArrayBuffer),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  };
}

/**
 * PDF export. Uses pdf-lib's built-in Helvetica (Latin-1 only), so characters outside that
 * range (e.g. Arabic names) are replaced with "?". Embed a Unicode font here to support them in PDF.
 */
const latin = (s: string) => s.replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");

export async function toPdf(ds: ExportDataset): Promise<ExportFile> {
  const digits = currencyDigits(ds.currency);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const landscape = ds.columns.length > 5;
  const [W, H] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  const margin = 36;
  const usable = W - margin * 2;

  // Column widths proportional to header/content length
  const weights = ds.columns.map((c) => {
    const maxLen = Math.max(c.header.length, ...ds.rows.slice(0, 50).map((r) => String(cellValue(c, r[c.key], digits)).length));
    return Math.min(28, Math.max(6, maxLen));
  });
  const totalW = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / totalW) * usable);

  const fit = (text: string, f: PDFFont, size: number, width: number) => {
    let t = latin(text);
    if (f.widthOfTextAtSize(t, size) <= width - 6) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + "…", size) > width - 6) t = t.slice(0, -1);
    return t + "...";
  };

  let page = doc.addPage([W, H]);
  let y = H - margin;
  const drawHeader = () => {
    let x = margin;
    page.drawRectangle({ x: margin, y: y - 4, width: usable, height: 18, color: rgb(0.19, 0.22, 0.16) });
    ds.columns.forEach((c, i) => {
      page.drawText(fit(c.header, bold, 8, widths[i]!), { x: x + 3, y: y, size: 8, font: bold, color: rgb(1, 1, 1) });
      x += widths[i]!;
    });
    y -= 20;
  };

  page.drawText(latin(ds.title), { x: margin, y, size: 16, font: bold, color: rgb(0.1, 0.09, 0.06) });
  y -= 16;
  page.drawText(latin(`${ds.subtitle ?? ""}${ds.subtitle ? "  |  " : ""}Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC  |  ${ds.rows.length} rows`), {
    x: margin,
    y,
    size: 8,
    font,
    color: rgb(0.4, 0.38, 0.33),
  });
  y -= 22;
  drawHeader();

  ds.rows.forEach((row, ri) => {
    if (y < margin + 14) {
      page = doc.addPage([W, H]);
      y = H - margin;
      drawHeader();
    }
    if (ri % 2 === 1) page.drawRectangle({ x: margin, y: y - 4, width: usable, height: 14, color: rgb(0.96, 0.94, 0.91) });
    let x = margin;
    ds.columns.forEach((c, i) => {
      const text = String(cellValue(c, row[c.key], digits));
      page.drawText(fit(text, font, 8, widths[i]!), { x: x + 3, y, size: 8, font, color: rgb(0.1, 0.09, 0.06) });
      x += widths[i]!;
    });
    y -= 14;
  });

  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - margin - 60, y: 18, size: 7, font, color: rgb(0.5, 0.5, 0.5) }));
  return { buffer: await doc.save(), contentType: "application/pdf", extension: "pdf" };
}

export async function exportDataset(ds: ExportDataset, format: ExportFormat): Promise<ExportFile> {
  if (format === "xlsx") return toXlsx(ds);
  if (format === "pdf") return toPdf(ds);
  return toCsv(ds);
}
