import { useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  REPORT_PRIORITIES,
  REPORT_PRIORITY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  type ReportPriority,
  type ReportStatus,
} from "../../shared/constants";
import { api, useApi, type Asset, type Report } from "../api";
import { useUser } from "../auth";
import {
  Container,
  EmptyState,
  Field,
  FilterSelect,
  formatDate,
  FormDialog,
  Loader,
  MobileList,
  MobileListItem,
  PageToolbar,
  PriorityBadge,
  SearchInput,
  SelectField,
  StatusBadge,
} from "../components/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTable, CardToolbar } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function ReportsPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = useApi<Report[]>("/reports");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<ReportPriority | null>(null);

  const status = (REPORT_STATUSES as readonly string[]).includes(params.get("status") ?? "")
    ? (params.get("status") as ReportStatus)
    : null;
  // `?new=<assetId>` opens the form, preselecting that asset when one is given.
  const newFor = params.get("new");

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const counts = useMemo(() => {
    const c = Object.fromEntries(REPORT_STATUSES.map((s) => [s, 0])) as Record<ReportStatus, number>;
    for (const r of state.data ?? []) c[r.status]++;
    return c;
  }, [state.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.data ?? []).filter(
      (r) =>
        (!status || r.status === status) &&
        (!priority || r.priority === priority) &&
        (!q ||
          [r.title, r.asset.name, r.asset.assetTag, r.reporter.name, `#${r.id}`].some((v) => v.toLowerCase().includes(q))),
    );
  }, [state.data, status, priority, search]);

  const tabs: { value: ReportStatus | null; label: string; count: number }[] = [
    { value: null, label: "Semua", count: state.data?.length ?? 0 },
    ...REPORT_STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s], count: counts[s] })),
  ];

  return (
    <Container>
      <PageToolbar
        title="Laporan Kerusakan"
        description={
          user.role === "pegawai"
            ? "Laporan kerusakan aset yang Anda buat."
            : "Laporan kerusakan aset dari pegawai maupun teknisi."
        }
        actions={
          <Button onClick={() => setParam("new", "")}>
            <Plus />
            Buat Laporan
          </Button>
        }
      />
      <Loader state={state}>
        {(reports) => (
          <Card>
            <div className="flex gap-1 overflow-x-auto border-b border-border px-5" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  role="tab"
                  aria-selected={status === t.value}
                  onClick={() => setParam("status", t.value)}
                  className={cn(
                    "-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-2.5 py-3.5 text-sm font-medium transition-colors",
                    status === t.value
                      ? "border-primary text-primary"
                      : "border-transparent text-secondary-foreground hover:text-primary",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums",
                      status === t.value ? "bg-primary/10" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <CardHeader className="border-b-0 py-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari judul, aset, pelapor…" />
              <CardToolbar className="w-full sm:w-auto">
                <FilterSelect
                  value={priority}
                  onChange={setPriority}
                  allLabel="Semua prioritas"
                  options={REPORT_PRIORITIES.map((p) => ({ value: p, label: REPORT_PRIORITY_LABELS[p] }))}
                />
              </CardToolbar>
            </CardHeader>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title={reports.length === 0 ? "Belum ada laporan kerusakan" : "Tidak ada laporan yang cocok"}
                description={
                  reports.length === 0
                    ? "Laporkan aset yang rusak agar teknisi dapat menindaklanjutinya."
                    : "Coba ubah tab status, kata kunci, atau filter."
                }
                action={
                  reports.length === 0 && (
                    <Button variant="outline" onClick={() => setParam("new", "")}>
                      <Plus />
                      Buat Laporan
                    </Button>
                  )
                }
              />
            ) : (
              <>
              <MobileList>
                {filtered.map((r) => (
                  <MobileListItem
                    key={r.id}
                    to={`/reports/${r.id}`}
                    title={r.title}
                    subtitle={
                      <>
                        {r.asset.name} · <span className="font-mono">{r.asset.assetTag}</span>
                        <br />
                        {r.reporter.name} · {formatDate(r.createdAt)}
                      </>
                    }
                    badges={
                      <>
                        <StatusBadge value={r.status} />
                        <PriorityBadge value={r.priority} />
                      </>
                    }
                  />
                ))}
              </MobileList>
              <CardTable className="hidden border-t border-border md:grid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-5">Laporan</TableHead>
                      <TableHead>Aset</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pelapor</TableHead>
                      <TableHead className="pe-5">Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/reports/${r.id}`)}>
                        <TableCell className="ps-5">
                          <Link
                            to={`/reports/${r.id}`}
                            className="font-medium text-mono hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">#{r.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-secondary-foreground">{r.asset.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.asset.assetTag}</div>
                        </TableCell>
                        <TableCell>
                          <PriorityBadge value={r.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={r.status} />
                        </TableCell>
                        <TableCell className="text-secondary-foreground">{r.reporter.name}</TableCell>
                        <TableCell className="pe-5 text-secondary-foreground">{formatDate(r.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardTable>
              <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Menampilkan {filtered.length} dari {reports.length} laporan
              </div>
              </>
            )}
          </Card>
        )}
      </Loader>
      <ReportFormDialog
        open={newFor !== null}
        onOpenChange={(open) => !open && setParam("new", null)}
        defaultAssetId={newFor || undefined}
        onSaved={(id) => navigate(`/reports/${id}`)}
      />
    </Container>
  );
}

export function ReportFormDialog({
  report,
  defaultAssetId,
  open,
  onOpenChange,
  onSaved,
}: {
  report?: Report;
  defaultAssetId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: number) => void;
}) {
  const assets = useApi<Asset[]>("/assets");
  const list = assets.data ?? [];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={report ? "Ubah Laporan" : "Buat Laporan Kerusakan"}
      description={report ? undefined : "Jelaskan kerusakan yang terjadi agar teknisi dapat segera menindaklanjuti."}
      submitLabel={report ? "Simpan" : "Kirim Laporan"}
      onSubmit={async (v) => {
        const body = {
          assetId: Number(v.assetId),
          title: v.title?.trim(),
          description: v.description?.trim(),
          priority: v.priority,
        };
        const saved = await api<{ id: number }>(report ? `/reports/${report.id}` : "/reports", {
          method: report ? "PATCH" : "POST",
          body,
        });
        toast.success(report ? "Laporan berhasil diperbarui" : "Laporan berhasil dikirim");
        onOpenChange(false);
        onSaved(saved.id);
      }}
    >
      <Field label="Aset" htmlFor="report-asset" required>
        <SelectField
          id="report-asset"
          name="assetId"
          required
          placeholder={assets.data ? (list.length ? "Pilih aset yang rusak" : "Belum ada aset") : "Memuat…"}
          disabled={assets.data !== null && list.length === 0}
          defaultValue={report ? String(report.asset.id) : defaultAssetId}
          options={list.map((a) => ({
            value: String(a.id),
            label: (
              <>
                <span className="font-mono text-xs text-muted-foreground">{a.assetTag}</span> {a.name}
              </>
            ),
          }))}
        />
      </Field>
      <Field label="Judul" htmlFor="report-title" required>
        <Input
          id="report-title"
          name="title"
          required
          maxLength={255}
          defaultValue={report?.title}
          placeholder="Contoh: Layar tidak menyala"
        />
      </Field>
      <Field label="Deskripsi Kerusakan" htmlFor="report-desc" required>
        <Textarea
          id="report-desc"
          name="description"
          rows={4}
          required
          defaultValue={report?.description}
          placeholder="Kapan mulai terjadi, gejala yang terlihat, dan dampaknya."
        />
      </Field>
      <Field label="Prioritas" htmlFor="report-priority" required>
        <SelectField
          id="report-priority"
          name="priority"
          required
          defaultValue={report?.priority ?? "sedang"}
          options={REPORT_PRIORITIES.map((p) => ({ value: p, label: REPORT_PRIORITY_LABELS[p] }))}
        />
      </Field>
    </FormDialog>
  );
}
