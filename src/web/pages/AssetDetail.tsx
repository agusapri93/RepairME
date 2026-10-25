import { useState, type ReactNode } from "react";
import { CalendarClock, ClipboardList, EllipsisVertical, Hammer, Pencil, Trash2, Wrench } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { api, formatFloor, useApi, type AssetDetail } from "../api";
import { useAuth } from "../auth";
import {
  ConditionBadge,
  Container,
  DueBadge,
  EmptyState,
  errorText,
  Field,
  formatDate,
  FormDialog,
  InfoList,
  Loader,
  PageToolbar,
  StatusBadge,
  useConfirm,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssetFormDialog } from "./Assets";

const todayIso = () => new Date().toISOString().slice(0, 10);

function daysUntil(date: string) {
  return Math.round((Date.parse(date) - Date.parse(todayIso())) / 86_400_000);
}

export function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { hasRole } = useAuth();
  const state = useApi<AssetDetail>(`/assets/${id}`);
  const [dialog, setDialog] = useState<"edit" | "maintenance" | null>(null);

  const isAdmin = hasRole("administrator");
  const canMaintain = hasRole("administrator", "teknisi");

  async function deleteAsset(asset: AssetDetail) {
    const ok = await confirm({
      title: `Hapus aset ${asset.assetTag}?`,
      description: `"${asset.name}" beserta riwayat pemeliharaannya akan dihapus permanen.`,
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/assets/${asset.id}`, { method: "DELETE" });
      toast.success("Aset berhasil dihapus");
      navigate("/assets");
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  async function deleteMaintenance(assetId: number, recordId: number) {
    const ok = await confirm({ title: "Hapus catatan pemeliharaan ini?", confirmLabel: "Hapus", destructive: true });
    if (!ok) return;
    try {
      await api(`/assets/${assetId}/maintenance/${recordId}`, { method: "DELETE" });
      toast.success("Catatan pemeliharaan dihapus");
      await state.reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  return (
    <Container>
      <Loader state={state}>
        {(asset) => (
          <>
            <PageToolbar
              back={{ to: "/assets", label: "Aset" }}
              title={asset.name}
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{asset.assetTag}</span>
                  <span>·</span>
                  {asset.category.name}
                  <ConditionBadge value={asset.condition} />
                </span>
              }
              actions={
                <>
                  <Button variant="outline" asChild>
                    <Link to={`/reports?new=${asset.id}`}>
                      <Wrench />
                      Laporkan Kerusakan
                    </Link>
                  </Button>
                  {canMaintain && (
                    <Button variant="outline" onClick={() => setDialog("maintenance")}>
                      <Hammer />
                      Catat Pemeliharaan
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button onClick={() => setDialog("edit")}>
                        <Pencil />
                        Ubah
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" mode="icon" aria-label="Aksi lainnya">
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onSelect={() => void deleteAsset(asset)}>
                            <Trash2 />
                            Hapus Aset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </>
              }
            />

            <div className="grid gap-5 lg:grid-cols-3 lg:gap-7.5">
              <div className="grid content-start gap-5 lg:col-span-2 lg:gap-7.5">
                <Card>
                  <CardHeader>
                    <CardTitle>Informasi Aset</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InfoList
                      items={[
                        { label: "Asset Tag", value: <span className="font-mono">{asset.assetTag}</span> },
                        { label: "Kategori", value: asset.category.name },
                        { label: "Kondisi", value: <ConditionBadge value={asset.condition} /> },
                        {
                          label: "Gedung",
                          value: !asset.location ? (
                            <span className="text-muted-foreground">Belum ditempatkan</span>
                          ) : isAdmin ? (
                            <Link to={`/master/buildings/${asset.location.buildingId}`} className="hover:text-primary">
                              {asset.location.buildingName}
                            </Link>
                          ) : (
                            asset.location.buildingName
                          ),
                        },
                        {
                          label: "Ruangan",
                          value: asset.location
                            ? [asset.location.roomName, formatFloor(asset.location.floor)].filter(Boolean).join(" · ")
                            : "-",
                        },
                        { label: "Tanggal Pembelian", value: formatDate(asset.purchaseDate) },
                        { label: "Terdaftar", value: formatDate(asset.createdAt) },
                      ]}
                    />
                    {asset.notes && (
                      <div className="rounded-lg bg-muted/60 p-4 text-sm whitespace-pre-wrap text-secondary-foreground">
                        {asset.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Riwayat Pemeliharaan</CardTitle>
                    {canMaintain && (
                      <CardToolbar>
                        <Button variant="outline" size="sm" onClick={() => setDialog("maintenance")}>
                          <Hammer />
                          Catat
                        </Button>
                      </CardToolbar>
                    )}
                  </CardHeader>
                  {asset.maintenance.length === 0 ? (
                    <EmptyState icon={Hammer} title="Belum ada catatan pemeliharaan" />
                  ) : (
                    <CardContent>
                      <ol className="relative space-y-5 border-s border-border ps-5">
                        {asset.maintenance.map((m) => (
                          <li key={m.id} className="relative">
                            <span className="absolute -start-[25px] top-1 size-2.5 rounded-full border-2 border-background bg-primary" />
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm whitespace-pre-wrap text-mono">{m.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(m.performedAt)}
                                  {m.performedBy && ` · ${m.performedBy}`}
                                </p>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  mode="icon"
                                  size="sm"
                                  aria-label="Hapus catatan"
                                  onClick={() => void deleteMaintenance(asset.id, m.id)}
                                >
                                  <Trash2 />
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  )}
                </Card>
              </div>

              <div className="grid content-start gap-5 lg:gap-7.5">
                <Card>
                  <CardHeader>
                    <CardTitle>Pemeliharaan Rutin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {asset.maintenanceIntervalDays ? (
                      <dl className="space-y-3.5 text-sm">
                        <Row label="Interval" value={`Setiap ${asset.maintenanceIntervalDays} hari`} />
                        <Row label="Terakhir" value={formatDate(asset.lastMaintenanceAt)} />
                        <Row
                          label="Berikutnya"
                          value={
                            asset.nextMaintenanceAt && (
                              <span className="flex flex-col items-end gap-1">
                                {formatDate(asset.nextMaintenanceAt)}
                                <DueBadge daysLeft={daysUntil(asset.nextMaintenanceAt)} />
                              </span>
                            )
                          }
                        />
                      </dl>
                    ) : (
                      <EmptyState
                        className="py-6"
                        icon={CalendarClock}
                        title="Tidak terjadwal"
                        description={isAdmin ? "Isi interval pemeliharaan lewat tombol Ubah." : undefined}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Laporan Kerusakan</CardTitle>
                    <CardToolbar>
                      <span className="text-sm text-muted-foreground">{asset.reports.length}</span>
                    </CardToolbar>
                  </CardHeader>
                  {asset.reports.length === 0 ? (
                    <EmptyState className="py-8" icon={ClipboardList} title="Belum ada laporan" />
                  ) : (
                    <ul className="divide-y divide-border">
                      {asset.reports.map((r) => (
                        <li key={r.id}>
                          <Link
                            to={`/reports/${r.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-mono">{r.title}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                            </span>
                            <StatusBadge value={r.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>

            {isAdmin && (
              <AssetFormDialog
                asset={asset}
                open={dialog === "edit"}
                onOpenChange={(open) => setDialog(open ? "edit" : null)}
                onSaved={() => void state.reload()}
              />
            )}
            {canMaintain && (
              <FormDialog
                open={dialog === "maintenance"}
                onOpenChange={(open) => setDialog(open ? "maintenance" : null)}
                title="Catat Pemeliharaan"
                description={`${asset.assetTag} · ${asset.name}`}
                onSubmit={async (v) => {
                  await api(`/assets/${asset.id}/maintenance`, {
                    method: "POST",
                    body: { performedAt: v.performedAt, description: v.description?.trim() },
                  });
                  toast.success("Pemeliharaan berhasil dicatat");
                  setDialog(null);
                  await state.reload();
                }}
              >
                <Field label="Tanggal" htmlFor="m-date" required>
                  <Input id="m-date" name="performedAt" type="date" required max={todayIso()} defaultValue={todayIso()} />
                </Field>
                <Field label="Pekerjaan yang Dilakukan" htmlFor="m-desc" required>
                  <Textarea
                    id="m-desc"
                    name="description"
                    rows={4}
                    required
                    placeholder="Contoh: Pembersihan kipas dan penggantian thermal paste"
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium text-mono">{value ?? "-"}</dd>
    </div>
  );
}
