export type ColumnType = "text" | "number" | "money" | "date" | "datetime";

export interface ExportColumn {
  key: string;
  header: string;
  type?: ColumnType;
  width?: number;
}

export interface ExportDataset {
  title: string;
  filename: string;
  subtitle?: string;
  currency: string;
  columns: ExportColumn[];
  rows: Record<string, string | number | null | undefined>[];
}

export type ExportFormat = "csv" | "xlsx" | "pdf";
