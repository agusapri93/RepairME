import { useState } from "react";
import { Check, ClipboardCheck, EllipsisVertical, Package, Pencil, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  ASSET_CONDITION_LABELS,
  ASSET_CONDITIONS,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  type ReportStatus,
} from "../../shared/constants";
import { api, useApi, type Report } from "../api";
import { useAuth } from "../auth";
import {
  ConditionBadge,
  Container,
  errorText,
  Field,
  formatDateTime,
  FormDialog,
  InfoList,
  Loader,
  orNull,
  PageToolbar,
  PriorityBadge,
  SelectField,
  StatusBadge,
  useConfirm,
} from "../components/common";
import { UserAvatar } from "../components/layout/UserMenu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ReportFormDialog } from "./Reports";

const KEEP_CONDITION = "__keep__";

export function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { hasRole } = useAuth();
  const state = useApi<Report>(`/reports/${id}`);
  const [dialog, setDialog] = useState<"edit" | "follow-up" | null>(null);

  const isAdmin = hasRole("administrator");
  const canFollowUp = hasRole("administrator", "teknisi");

  async function deleteReport(report: Report) {
    const ok = await confirm({
      title: `Hapus laporan #${report.id}?`,
      description: `"${report.title}" akan dihapus permanen.`,
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/reports/${report.id}`, { method: "DELETE" });
      toast.success("Laporan berhasil dihapus");
      navigate("/reports");
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  return (
    <Container>
      <Loader state={state}>
        {(report) => (
          <>
            <PageToolbar
              back={{ to: "/reports", label: "Laporan Kerusakan" }}
              title={report.title}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  Laporan #{report.id} · {formatDateTime(report.createdAt)}
                  <StatusBadge value={report.status} />
                </span>
              }
              actions={
                <>
                  {canFollowUp && (
                    <Button onClick={() => setDialog("follow-up")}>
                      <ClipboardCheck />
                      Tindak Lanjuti
                    </Button>
                  )}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" mode="icon" aria-label="Aksi lainnya">
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDialog("edit")}>
                          <Pencil />
                          Ubah Laporan
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => void deleteReport(report)}>
                          <Trash2 />
                          Hapus Laporan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              }
            />

            <div className="grid gap-5 lg:grid-cols-3 lg:gap-7.5">
              <div className="grid content-start gap-5 lg:col-span-2 lg:gap-7.5">
                <Card>
                  <CardHeader>
                    <CardTitle>Detail Kerusakan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-mono">{report.description}</p>
                    <InfoList
                      items={[
                        { label: "Prioritas", value: <PriorityBadge value={report.priority} /> },
                        {
                          label: "Pelapor",
                          value: (
                            <span className="flex items-center gap-2">
                              <UserAvatar name={report.reporter.name} className="size-6 text-[10px]" />
                              {report.reporter.name}
                            </span>
                          ),
                        },
                        { label: "Dilaporkan", value: formatDateTime(report.createdAt) },
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tindak Lanjut</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StatusSteps status={report.status} />
                    {report.handler ? (
                      <div className="space-y-4">
                        <InfoList
                          items={[
                            {
                              label: "Ditangani oleh",
                              value: (
                                <span className="flex items-center gap-2">
                                  <UserAvatar name={report.handler.name} className="size-6 text-[10px]" />
                                  {report.handler.name}
                                </span>
                              ),
                            },
                            { label: "Terakhir diperbarui", value: formatDateTime(report.updatedAt) },
                            ...(report.resolvedAt ? [{ label: "Selesai pada", value: formatDateTime(report.resolvedAt) }] : []),
                          ]}
                        />
                        {report.followUpNotes && (
                          <div className="rounded-lg bg-muted/60 p-4 text-sm whitespace-pre-wrap text-secondary-foreground">
                            {report.followUpNotes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Laporan ini belum ditindaklanjuti oleh teknisi.
                        {canFollowUp && " Klik “Tindak Lanjuti” untuk memperbarui statusnya."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="content-start self-start">
                <CardHeader>
                  <CardTitle>Aset</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/assets/${report.asset.id}`} className="group flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-mono group-hover:text-primary">
                        {report.asset.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{report.asset.assetTag}</span>
                    </span>
                  </Link>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kondisi saat ini</span>
                    <ConditionBadge value={report.asset.condition} />
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/assets/${report.asset.id}`}>Lihat Detail Aset</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {isAdmin && (
              <ReportFormDialog
                report={report}
                open={dialog === "edit"}
                onOpenChange={(open) => setDialog(open ? "edit" : null)}
                onSaved={() => void state.reload()}
              />
            )}
            {canFollowUp && (
              <FormDialog
                open={dialog === "follow-up"}
                onOpenChange={(open) => setDialog(open ? "follow-up" : null)}
                title="Tindak Lanjuti Laporan"
                description={`#${report.id} · ${report.title}`}
                submitLabel="Simpan Tindak Lanjut"
                onSubmit={async (v) => {
                  await api(`/reports/${report.id}/follow-up`, {
                    method: "PATCH",
                    body: {
                      status: v.status,
                      followUpNotes: orNull(v.followUpNotes),
                      ...(v.assetCondition && v.assetCondition !== KEEP_CONDITION && { assetCondition: v.assetCondition }),
                    },
                  });
                  toast.success("Tindak lanjut berhasil disimpan");
                  setDialog(null);
                  await state.reload();
                }}
              >
                <Field label="Status" htmlFor="fu-status" required>
                  <SelectField
                    id="fu-status"
                    name="status"
                    required
                    defaultValue={report.status === "dilaporkan" ? "diproses" : report.status}
                    options={REPORT_STATUSES.map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s] }))}
                  />
                </Field>
                <Field label="Catatan Tindak Lanjut" htmlFor="fu-notes">
                  <Textarea
                    id="fu-notes"
                    name="followUpNotes"
                    rows={4}
                    defaultValue={report.followUpNotes ?? ""}
                    placeholder="Apa yang sudah dicek atau diperbaiki?"
                  />
                </Field>
                <Field
                  label="Perbarui Kondisi Aset"
                  htmlFor="fu-condition"
                  hint="Opsional, misalnya setelah aset selesai diperbaiki."
                >
                  <SelectField
                    id="fu-condition"
                    name="assetCondition"
                    defaultValue={KEEP_CONDITION}
                    options={[
                      {
                        value: KEEP_CONDITION,
                        label: `Tidak diubah (${ASSET_CONDITION_LABELS[report.asset.condition]})`,
                      },
                      ...ASSET_CONDITIONS.map((c) => ({ value: c, label: ASSET_CONDITION_LABELS[c] })),
                    ]}
                  />
                </Field>
              </FormDialog>
            )}
          </>
        )}
      </Loader>
    </Container>
  );
}

/** Dilaporkan → Diproses → Selesai/Ditolak, highlighting how far the report has come. */
function StatusSteps({ status }: { status: ReportStatus }) {
  const rejected = status === "ditolak";
  const steps: { key: ReportStatus; label: string }[] = [
    { key: "dilaporkan", label: "Dilaporkan" },
    { key: "diproses", label: "Diproses" },
    rejected ? { key: "ditolak", label: "Ditolak" } : { key: "selesai", label: "Selesai" },
  ];
  // A rejected report may skip "diproses"; treat it as reached so the line looks complete.
  const reached = rejected ? 2 : steps.findIndex((s) => s.key === status);

  return (
    <ol className="flex items-center">
      {steps.map((step, i) => {
        const done = i <= reached;
        const last = i === steps.length - 1;
        const failed = rejected && last;
        return (
          <li key={step.key} className={cn("flex items-center", !last && "grow")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  failed
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {failed ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium", done ? "text-mono" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {!last && (
              <span className={cn("mx-2 mb-5 h-0.5 grow rounded-full", i < reached ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
