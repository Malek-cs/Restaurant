import { z } from "zod";
import { apiRouteWith } from "@/lib/api/handler";
import { exportDataset } from "@/lib/export/exporters";
import { buildExport, type ExportType } from "@/services/export.service";
import { notFound } from "@/lib/api/errors";

const types = new Set<ExportType>(["orders", "customers", "payments", "revenue"]);
const query = z.object({ format: z.enum(["csv", "xlsx", "pdf"]).default("csv") }).catchall(z.string().max(100));

/** Extra permission per dataset on top of export:data. */
const REQUIRED: Record<ExportType, string> = {
  orders: "orders:view",
  customers: "customers:view",
  payments: "payments:view",
  revenue: "analytics:view",
};

export const GET = apiRouteWith<{ type: string }>()({ permission: "export:data", query }, async ({ params, query, user, audit }) => {
  if (!types.has(params.type as ExportType)) throw notFound("Export");
  const type = params.type as ExportType;
  if (!user.permissions.includes(REQUIRED[type] as never) && !user.permissions.includes("orders:manage" as never)) {
    const { forbidden } = await import("@/lib/api/errors");
    throw forbidden();
  }
  const { format, ...filters } = query;
  const dataset = await buildExport(type, filters as Record<string, string>, user);
  const file = await exportDataset(dataset, format);
  await audit({ action: "export.created", entity: "Export", summary: `${user.name} exported ${dataset.title.toLowerCase()} as ${format.toUpperCase()} (${dataset.rows.length} rows).` });
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${dataset.filename}.${file.extension}"`,
      "Cache-Control": "no-store",
    },
  });
});
