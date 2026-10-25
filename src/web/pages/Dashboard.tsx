import type { ReactNode } from "react";
import { ArrowUpRight, CalendarClock, CalendarX2, Package, Wrench, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import {
  ASSET_CONDITION_LABELS,
  ASSET_CONDITIONS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  type AssetCondition,
  type ReportStatus,
} from "../../shared/constants";
import { useApi, type Dashboard } from "../api";
import { useUser } from "../auth";
import {
  CardSkeleton,
  Container,
  DueBadge,
  EmptyState,
  formatDate,
  Loader,
  PageToolbar,
  StatusBadge,
} from "../components/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const conditionColor: Record<AssetCondition, string> = {
  baik: "bg-green-500",
  rusak_ringan: "bg-yellow-500",
  rusak_berat: "bg-red-500",
};
const statusColor: Record<ReportStatus, string> = {
  dilaporkan: "bg-blue-500",
  diproses: "bg-yellow-500",
  selesai: "bg-green-500",
  ditolak: "bg-zinc-400",
};

function DashboardSkeleton() {
  return (
    <div className="grid gap-5 *:min-w-0 lg:gap-7.5">
      <div className="grid grid-cols-2 gap-5 *:min-w-0 lg:grid-cols-4 lg:gap-7.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 *:min-w-0 lg:grid-cols-2 lg:gap-7.5">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={3} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useUser();
  const state = useApi<Dashboard>("/dashboard");
  const ownOnly = user.role === "pegawai";
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Container>
      <PageToolbar title="Dashboard" description={`Halo, ${user.name}. Ringkasan per ${today}.`} />
      <Loader state={state} skeleton={<DashboardSkeleton />}>
        {(d) => {
          const open = d.reports.byStatus.dilaporkan + d.reports.byStatus.diproses;
          const totalReports = REPORT_STATUSES.reduce((sum, s) => sum + d.reports.byStatus[s], 0);

          return (
            <div className="grid gap-5 *:min-w-0 lg:gap-7.5">
              <div className="grid grid-cols-2 gap-5 *:min-w-0 lg:grid-cols-4 lg:gap-7.5">
                <StatCard icon={Package} tone="primary" label="Total Aset" value={d.assets.total} to="/assets" />
                <StatCard
                  icon={Wrench}
                  tone="warning"
                  label={ownOnly ? "Laporan Saya Terbuka" : "Laporan Terbuka"}
                  value={open}
                  to="/reports"
                />
                <StatCard icon={CalendarX2} tone="destructive" label="Pemeliharaan Terlambat" value={d.maintenance.overdue} />
                <StatCard
                  icon={CalendarClock}
                  tone="info"
                  label={`Jatuh Tempo ≤ ${MAINTENANCE_DUE_SOON_DAYS} Hari`}
                  value={d.maintenance.dueSoon}
                />
              </div>

              <div className="grid gap-5 *:min-w-0 lg:grid-cols-2 lg:gap-7.5">
                <Card>
                  <CardHeader>
                    <CardTitle>Kondisi Aset</CardTitle>
                    <CardToolbar>
                      <span className="text-sm text-muted-foreground">{d.assets.total} aset</span>
                    </CardToolbar>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Distribution
                      total={d.assets.total}
                      parts={ASSET_CONDITIONS.map((c) => ({
                        key: c,
                        label: ASSET_CONDITION_LABELS[c],
                        value: d.assets.byCondition[c],
                        color: conditionColor[c],
                      }))}
                      empty="Belum ada aset."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{ownOnly ? "Status Laporan Saya" : "Status Laporan Kerusakan"}</CardTitle>
                    <CardToolbar>
                      <span className="text-sm text-muted-foreground">{totalReports} laporan</span>
                    </CardToolbar>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Distribution
                      total={totalReports}
                      parts={REPORT_STATUSES.map((s) => ({
                        key: s,
                        label: REPORT_STATUS_LABELS[s],
                        value: d.reports.byStatus[s],
                        color: statusColor[s],
                      }))}
                      empty="Belum ada laporan kerusakan."
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 *:min-w-0 lg:grid-cols-2 lg:gap-7.5">
                <Card>
                  <CardHeader>
                    <CardTitle>Jadwal Pemeliharaan Rutin</CardTitle>
                    <CardToolbar>
                      <span className="text-sm text-muted-foreground">{d.maintenance.scheduled} aset terjadwal</span>
                    </CardToolbar>
                  </CardHeader>
                  {d.maintenance.upcoming.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="Belum ada jadwal"
                      description="Isi interval pemeliharaan pada data aset agar jadwalnya muncul di sini."
                    />
                  ) : (
                    <ListRows>
                      {d.maintenance.upcoming.map((m) => (
                        <ListRow
                          key={m.id}
                          to={`/assets/${m.id}`}
                          title={m.name}
                          subtitle={<span className="font-mono">{m.assetTag}</span>}
                          meta={
                            <>
                              <span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(m.nextMaintenanceAt)}</span>
                              <DueBadge daysLeft={m.daysLeft} />
                            </>
                          }
                        />
                      ))}
                    </ListRows>
                  )}
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pemeliharaan Terakhir</CardTitle>
                  </CardHeader>
                  {d.maintenance.recent.length === 0 ? (
                    <EmptyState icon={CalendarClock} title="Belum ada catatan pemeliharaan" />
                  ) : (
                    <ListRows>
                      {d.maintenance.recent.map((m) => (
                        <ListRow
                          key={m.id}
                          to={`/assets/${m.asset.id}`}
                          title={m.asset.name}
                          subtitle={m.description}
                          meta={
                            <span className="text-end text-xs text-muted-foreground">
                              {formatDate(m.performedAt)}
                              {m.performedBy && <span className="block">{m.performedBy}</span>}
                            </span>
                          }
                        />
                      ))}
                    </ListRows>
                  )}
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{ownOnly ? "Laporan Saya Terbaru" : "Laporan Kerusakan Terbaru"}</CardTitle>
                  <CardToolbar>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/reports">
                        Lihat semua
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </CardToolbar>
                </CardHeader>
                {d.reports.recent.length === 0 ? (
                  <EmptyState icon={Wrench} title="Belum ada laporan kerusakan" />
                ) : (
                  <ListRows>
                    {d.reports.recent.map((r) => (
                      <ListRow
                        key={r.id}
                        to={`/reports/${r.id}`}
                        title={r.title}
                        subtitle={
                          <>
                            {r.asset.name} · <span className="font-mono">{r.asset.assetTag}</span>
                          </>
                        }
                        meta={
                          <>
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {formatDate(r.createdAt)}
                            </span>
                            <StatusBadge value={r.status} />
                          </>
                        }
                      />
                    ))}
                  </ListRows>
                )}
              </Card>
            </div>
          );
        }}
      </Loader>
    </Container>
  );
}

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  to,
}: {
  icon: LucideIcon;
  tone: keyof typeof toneClasses;
  label: string;
  value: number;
  to?: string;
}) {
  const body = (
    <Card className={cn("h-full", to && "transition-shadow hover:shadow-md")}>
      <CardContent className="flex flex-col gap-4">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-semibold tabular-nums text-mono">{value}</span>
          <span className="text-sm text-secondary-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function Distribution({
  total,
  parts,
  empty,
}: {
  total: number;
  parts: { key: string; label: string; value: number; color: string }[];
  empty: string;
}) {
  if (total === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) =>
          p.value ? <div key={p.key} className={p.color} style={{ width: `${(p.value / total) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-secondary-foreground">
              <span className={cn("size-2 rounded-full", p.color)} />
              {p.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-mono">
              {p.value}
              <span className="ms-1.5 text-xs font-normal text-muted-foreground">{Math.round((p.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ListRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>;
}

function ListRow({ to, title, subtitle, meta }: { to: string; title: ReactNode; subtitle?: ReactNode; meta?: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/50">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-mono">{title}</span>
          {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {meta && <span className="flex shrink-0 items-center gap-2.5">{meta}</span>}
      </Link>
    </li>
  );
}
