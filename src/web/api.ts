import { useCallback, useEffect, useState } from "react";
import type { AssetCondition, ReportPriority, ReportStatus, Role } from "../shared/constants";

export type SessionUser = { id: number; name: string; email: string; role: Role };

export type UserRow = SessionUser & { isActive: boolean; createdAt: string };

export type AssetCategory = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  assetCount: number;
  lastTagNumber: number;
  createdAt: string;
};

/** The tag the next asset in this category will get, mirroring the server's format. */
export function nextAssetTag(category: Pick<AssetCategory, "code" | "lastTagNumber">) {
  return `${category.code}-${String(category.lastTagNumber + 1).padStart(4, "0")}`;
}

export type Room = { id: number; buildingId: number; name: string; floor: string | null; assetCount: number };

export type Building = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  managerName: string | null;
  rooms: Room[];
  assetCount: number;
  createdAt: string;
};

export type AssetLocation = {
  roomId: number;
  roomName: string;
  floor: string | null;
  buildingId: number;
  buildingName: string;
};

/** "2" → "Lt. 2"; anything else (e.g. "Basement") is shown as typed. */
export function formatFloor(floor: string | null) {
  if (!floor) return null;
  return /^\d+$/.test(floor) ? `Lt. ${floor}` : floor;
}

/** "Ruang Server (Lt. 2) · Gedung A" */
export function formatLocation(location: AssetLocation | null) {
  if (!location) return null;
  const floor = formatFloor(location.floor);
  return `${floor ? `${location.roomName} (${floor})` : location.roomName} · ${location.buildingName}`;
}

export type Asset = {
  id: number;
  assetTag: string;
  name: string;
  categoryId: number;
  category: Pick<AssetCategory, "id" | "name" | "code">;
  roomId: number | null;
  location: AssetLocation | null;
  purchaseDate: string | null;
  condition: AssetCondition;
  maintenanceIntervalDays: number | null;
  notes: string | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  createdAt: string;
};

export type AssetDetail = Asset & {
  maintenance: { id: number; performedAt: string; description: string; performedBy: string | null }[];
  reports: { id: number; title: string; status: ReportStatus; priority: ReportPriority; createdAt: string }[];
};

export type Report = {
  id: number;
  title: string;
  description: string;
  priority: ReportPriority;
  status: ReportStatus;
  followUpNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset: { id: number; assetTag: string; name: string; condition: AssetCondition };
  reporter: { id: number; name: string };
  handler: { id: number; name: string } | null;
};

type AssetRef = { id: number; assetTag: string; name: string };

export type Dashboard = {
  assets: { total: number; byCondition: Record<AssetCondition, number> };
  maintenance: {
    scheduled: number;
    overdue: number;
    dueSoon: number;
    upcoming: (AssetRef & { nextMaintenanceAt: string; daysLeft: number })[];
    recent: { id: number; performedAt: string; description: string; asset: AssetRef; performedBy: string | null }[];
  };
  reports: {
    byStatus: Record<ReportStatus, number>;
    recent: { id: number; title: string; status: ReportStatus; priority: ReportPriority; createdAt: string; asset: AssetRef }[];
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Fired when the server says the session is gone, so the app can drop back to the login page. */
export const UNAUTHORIZED_EVENT = "repairme:unauthorized";

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, errorMessage(res.status, data));
  }
  return data as T;
}

function errorMessage(status: number, data: unknown) {
  if (data && typeof data === "object") {
    // Elysia validation errors carry a `summary`; our own errors carry a `message`.
    if ("type" in data && data.type === "validation" && "summary" in data) return `Data tidak valid: ${data.summary}`;
    if ("message" in data && typeof data.message === "string") return data.message;
  }
  return `Permintaan gagal (${status})`;
}

/** Loads `path` on mount and whenever it changes; `reload` re-fetches after a mutation. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
