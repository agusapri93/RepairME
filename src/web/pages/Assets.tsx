import { useMemo, useState } from "react";
import { Package, Plus, Tags } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  ASSET_CONDITION_LABELS,
  ASSET_CONDITIONS,
  MAINTENANCE_DUE_SOON_DAYS,
  type AssetCondition,
} from "../../shared/constants";
import {
  api,
  formatFloor,
  formatLocation,
  useApi,
  type Asset,
  type AssetCategory,
  type Building,
} from "../api";
import { useAuth } from "../auth";
import {
  ComboboxField,
  ConditionBadge,
  Container,
  EmptyState,
  Field,
  FilterSelect,
  formatDate,
  FormDialog,
  Loader,
  MobileList,
  MobileListItem,
  orNull,
  PageToolbar,
  SearchInput,
} from "../components/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTable, CardToolbar } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function AssetsPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const state = useApi<Asset[]>("/assets");
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState<AssetCondition | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  // `?building=<id>` (from a building's "Lihat Aset" button) preselects that building.
  const [params] = useSearchParams();
  const [buildingId, setBuildingId] = useState<string | null>(params.get("building"));
  const [creating, setCreating] = useState(false);
  const isAdmin = hasRole("administrator");

  const options = (pairs: [number, string][]) =>
    pairs.map(([id, name]) => ({ value: String(id), label: name })).sort((a, b) => a.label.localeCompare(b.label));

  const categories = useMemo(
    () => options([...new Map((state.data ?? []).map((a) => [a.category.id, a.category.name] as [number, string]))]),
    [state.data],
  );
  const buildingOptions = useMemo(
    () =>
      options([
        ...new Map(
          (state.data ?? [])
            .filter((a) => a.location)
            .map((a) => [a.location!.buildingId, a.location!.buildingName] as [number, string]),
        ),
      ]),
    [state.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.data ?? []).filter(
      (a) =>
        (!condition || a.condition === condition) &&
        (!categoryId || String(a.category.id) === categoryId) &&
        (!buildingId || String(a.location?.buildingId) === buildingId) &&
        (!q ||
          [a.assetTag, a.name, a.category.name, formatLocation(a.location) ?? ""].some((v) => v.toLowerCase().includes(q))),
    );
  }, [state.data, search, condition, categoryId, buildingId]);

  const filtering = Boolean(search || condition || categoryId || buildingId);

  return (
    <Container>
      <PageToolbar
        title="Aset"
        description="Daftar aset beserta kondisi dan jadwal pemeliharaan rutinnya."
        actions={
          isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Tambah Aset
            </Button>
          )
        }
      />
      <Loader state={state}>
        {(assets) => (
          <Card>
            <CardHeader className="py-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari asset tag, nama, lokasi…" />
              <CardToolbar className="grid w-full grid-cols-2 sm:flex sm:w-auto">
                <FilterSelect
                  value={buildingId}
                  onChange={setBuildingId}
                  allLabel="Semua gedung"
                  options={buildingOptions}
                  className="col-span-2 sm:col-span-1"
                />
                <FilterSelect value={categoryId} onChange={setCategoryId} allLabel="Semua kategori" options={categories} />
                <FilterSelect
                  value={condition}
                  onChange={setCondition}
                  allLabel="Semua kondisi"
                  options={ASSET_CONDITIONS.map((c) => ({ value: c, label: ASSET_CONDITION_LABELS[c] }))}
                />
              </CardToolbar>
            </CardHeader>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title={filtering ? "Tidak ada aset yang cocok" : "Belum ada data aset"}
                description={
                  filtering
                    ? "Coba ubah kata kunci atau filter."
                    : isAdmin
                      ? "Tambahkan aset pertama Anda untuk mulai memantau kondisinya."
                      : undefined
                }
                action={
                  !filtering &&
                  isAdmin && (
                    <Button variant="outline" onClick={() => setCreating(true)}>
                      <Plus />
                      Tambah Aset
                    </Button>
                  )
                }
              />
            ) : (
              <>
              <MobileList>
                {filtered.map((a) => (
                  <MobileListItem
                    key={a.id}
                    to={`/assets/${a.id}`}
                    title={a.name}
                    subtitle={
                      <>
                        <span className="font-mono">{a.assetTag}</span> · {a.category.name}
                        {a.location && (
                          <>
                            <br />
                            {formatLocation(a.location)}
                          </>
                        )}
                      </>
                    }
                    badges={<ConditionBadge value={a.condition} />}
                  />
                ))}
              </MobileList>
              <CardTable className="hidden md:grid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-5">Asset Tag</TableHead>
                      <TableHead>Nama Aset</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Kondisi</TableHead>
                      <TableHead className="pe-5">Pemeliharaan Berikutnya</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/assets/${a.id}`)}>
                        <TableCell className="ps-5 font-mono text-xs text-secondary-foreground">{a.assetTag}</TableCell>
                        <TableCell>
                          <Link
                            to={`/assets/${a.id}`}
                            className="font-medium text-mono hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-secondary-foreground">{a.category.name}</TableCell>
                        <TableCell>
                          {a.location ? (
                            <>
                              <div className="text-secondary-foreground">{a.location.roomName}</div>
                              <div className="text-xs text-muted-foreground">
                                {[a.location.buildingName, formatFloor(a.location.floor)].filter(Boolean).join(" · ")}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Belum ditempatkan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ConditionBadge value={a.condition} />
                        </TableCell>
                        <TableCell className="pe-5">
                          <NextMaintenance date={a.nextMaintenanceAt} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardTable>
              <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Menampilkan {filtered.length} dari {assets.length} aset
              </div>
              </>
            )}
          </Card>
        )}
      </Loader>
      {isAdmin && (
        <AssetFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSaved={(asset) => navigate(`/assets/${asset.id}`)}
        />
      )}
    </Container>
  );
}

function NextMaintenance({ date }: { date: string | null }) {
  if (!date) return <span className="text-sm text-muted-foreground">Tidak terjadwal</span>;
  const daysLeft = Math.round((Date.parse(date) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);
  return (
    <span
      className={cn(
        "text-sm",
        daysLeft < 0 ? "font-medium text-destructive" : daysLeft <= MAINTENANCE_DUE_SOON_DAYS ? "font-medium text-yellow-600 dark:text-yellow-400" : "text-secondary-foreground",
      )}
    >
      {formatDate(date)}
      {daysLeft < 0 && <span className="ms-1 text-xs">(terlambat)</span>}
    </span>
  );
}

const UNPLACED = "__none__";

/**
 * Building → room pickers. Only the room is submitted (as `roomId`); the building just
 * narrows the room list, and "Belum ditempatkan" submits no room at all.
 */
function LocationFields({ defaultBuildingId, defaultRoomId }: { defaultBuildingId?: number; defaultRoomId?: number }) {
  const buildings = useApi<Building[]>("/buildings");
  const [buildingId, setBuildingId] = useState(defaultBuildingId ? String(defaultBuildingId) : UNPLACED);
  const [roomId, setRoomId] = useState(defaultRoomId ? String(defaultRoomId) : "");
  const list = buildings.data ?? [];
  const building = list.find((b) => String(b.id) === buildingId);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label="Gedung"
        htmlFor="asset-building"
        hint={
          buildings.data && list.length === 0 ? (
            <>
              Belum ada gedung.{" "}
              <Link to="/master/buildings" className="font-medium text-primary hover:underline">
                Tambahkan di Master Data
              </Link>
              .
            </>
          ) : undefined
        }
      >
        <ComboboxField
          id="asset-building"
          value={buildingId}
          onValueChange={(next) => {
            setBuildingId(next);
            setRoomId(""); // a room from the previous building doesn't apply
          }}
          disabled={!buildings.data}
          placeholder="Memuat…"
          searchPlaceholder="Cari gedung…"
          emptyText="Gedung tidak ditemukan."
          options={[
            { value: UNPLACED, label: "Belum ditempatkan" },
            ...list.map((b) => ({ value: String(b.id), label: b.name })),
          ]}
        />
      </Field>
      <Field
        label="Ruangan"
        htmlFor="asset-room"
        required={!!building}
        hint={building && building.rooms.length === 0 ? "Gedung ini belum memiliki ruangan." : undefined}
      >
        <ComboboxField
          id="asset-room"
          name="roomId"
          value={building ? roomId : ""}
          onValueChange={setRoomId}
          required={!!building}
          disabled={!building || building.rooms.length === 0}
          placeholder={building ? "Pilih ruangan" : "Pilih gedung dulu"}
          searchPlaceholder="Cari ruangan…"
          emptyText="Ruangan tidak ditemukan."
          options={(building?.rooms ?? []).map((r) => ({
            value: String(r.id),
            label: r.name,
            description: formatFloor(r.floor) ?? undefined,
          }))}
        />
      </Field>
    </div>
  );
}

export function AssetFormDialog({
  asset,
  open,
  onOpenChange,
  onSaved,
}: {
  asset?: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (asset: Asset) => void;
}) {
  const categories = useApi<AssetCategory[]>("/categories");
  const list = categories.data ?? [];
  const noCategories = categories.data !== null && list.length === 0;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={asset ? "Ubah Aset" : "Tambah Aset"}
      description={asset ? undefined : "Asset Tag akan dibuat otomatis dari kode kategori."}
      onSubmit={async (v) => {
        const body = {
          name: v.name?.trim(),
          categoryId: Number(v.categoryId),
          roomId: v.roomId ? Number(v.roomId) : null,
          purchaseDate: orNull(v.purchaseDate),
          condition: v.condition,
          maintenanceIntervalDays: v.maintenanceIntervalDays ? Number(v.maintenanceIntervalDays) : null,
          notes: orNull(v.notes),
        };
        const saved = await api<Asset>(asset ? `/assets/${asset.id}` : "/assets", {
          method: asset ? "PATCH" : "POST",
          body,
        });
        toast.success(asset ? "Aset berhasil diperbarui" : `Aset ${saved.assetTag} berhasil ditambahkan`);
        onOpenChange(false);
        onSaved(saved);
      }}
    >
      {noCategories && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm">
          <Tags className="size-5 shrink-0 text-muted-foreground" />
          <span className="text-secondary-foreground">
            Belum ada kategori aset.{" "}
            <Link to="/master/categories" className="font-medium text-primary hover:underline">
              Tambahkan di Master Data
            </Link>{" "}
            terlebih dahulu.
          </span>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Asset Tag" hint={asset ? "Asset Tag tidak dapat diubah." : "Dibuat otomatis saat disimpan."}>
          {/* Not an input, so the dialog's autofocus lands on the first editable field instead. */}
          <div className="flex h-8.5 items-center rounded-md border border-input bg-muted/60 px-3 text-[0.8125rem]">
            {asset ? (
              <span className="font-mono text-mono">{asset.assetTag}</span>
            ) : (
              <span className="text-muted-foreground">Otomatis</span>
            )}
          </div>
        </Field>
        <Field label="Kategori Aset" htmlFor="asset-category" required>
          <ComboboxField
            id="asset-category"
            name="categoryId"
            required
            disabled={noCategories}
            placeholder={categories.data ? "Pilih kategori" : "Memuat…"}
            searchPlaceholder="Cari kategori atau kode…"
            emptyText="Kategori tidak ditemukan."
            defaultValue={asset ? String(asset.categoryId) : undefined}
            options={list.map((c) => ({ value: String(c.id), label: c.name, description: c.code }))}
          />
        </Field>
      </div>
      <Field label="Nama Aset" htmlFor="asset-name" required>
        <Input id="asset-name" name="name" required maxLength={255} defaultValue={asset?.name} placeholder="Contoh: Laptop Dell Latitude 5440" />
      </Field>
      <LocationFields defaultBuildingId={asset?.location?.buildingId} defaultRoomId={asset?.roomId ?? undefined} />
      <Field label="Tanggal Pembelian" htmlFor="asset-purchase" className="sm:w-1/2 sm:pe-2.5">
        <Input id="asset-purchase" name="purchaseDate" type="date" defaultValue={asset?.purchaseDate ?? ""} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kondisi" htmlFor="asset-condition" required>
          <ComboboxField
            id="asset-condition"
            name="condition"
            required
            searchPlaceholder="Cari kondisi…"
            defaultValue={asset?.condition ?? "baik"}
            options={ASSET_CONDITIONS.map((c) => ({ value: c, label: ASSET_CONDITION_LABELS[c] }))}
          />
        </Field>
        <Field label="Interval Pemeliharaan (hari)" htmlFor="asset-interval" hint="Kosongkan jika tidak ada pemeliharaan rutin.">
          <Input
            id="asset-interval"
            name="maintenanceIntervalDays"
            type="number"
            min={1}
            max={3650}
            defaultValue={asset?.maintenanceIntervalDays ?? ""}
            placeholder="Contoh: 90"
          />
        </Field>
      </div>
      <Field label="Catatan" htmlFor="asset-notes">
        <Textarea id="asset-notes" name="notes" rows={3} defaultValue={asset?.notes ?? ""} />
      </Field>
    </FormDialog>
  );
}
