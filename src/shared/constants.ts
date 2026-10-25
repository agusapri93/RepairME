// Shared between server and web, so keep this file free of server-only imports.

export const ROLES = ["administrator", "pegawai", "teknisi"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  administrator: "Administrator",
  pegawai: "Pegawai",
  teknisi: "Teknisi",
};

export const ASSET_CONDITIONS = ["baik", "rusak_ringan", "rusak_berat"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
};

export const REPORT_STATUSES = ["dilaporkan", "diproses", "selesai", "ditolak"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  dilaporkan: "Dilaporkan",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export const REPORT_PRIORITIES = ["rendah", "sedang", "tinggi"] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

export const REPORT_PRIORITY_LABELS: Record<ReportPriority, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
};

/** Maintenance due within this many days counts as "due soon" on the dashboard. */
export const MAINTENANCE_DUE_SOON_DAYS = 7;
