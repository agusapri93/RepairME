import { useMemo, useState } from "react";
import { Building2, DoorOpen, MapPin, Package, Phone, Plus, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { api, useApi, type Building } from "../api";
import {
  Container,
  EmptyState,
  Field,
  FormDialog,
  Loader,
  orNull,
  PageToolbar,
  SearchInput,
} from "../components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function BuildingsPage() {
  const navigate = useNavigate();
  const state = useApi<Building[]>("/buildings");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.data ?? []).filter(
      (b) => !q || [b.name, b.address ?? "", b.managerName ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [state.data, search]);

  const addButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus />
      Tambah Gedung
    </Button>
  );

  return (
    <Container>
      <PageToolbar
        title="Gedung"
        description="Master data gedung beserta ruangannya. Ruangan dipakai sebagai lokasi aset."
        actions={addButton}
      />
      <Loader state={state}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="Belum ada data gedung"
                description="Tambahkan gedung, lalu isi ruangan-ruangannya agar bisa dipilih sebagai lokasi aset."
                action={addButton}
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {list.length > 3 && (
                <SearchInput value={search} onChange={setSearch} placeholder="Cari gedung, alamat, penanggung jawab…" />
              )}
              {filtered.length === 0 ? (
                <Card>
                  <EmptyState icon={Building2} title="Tidak ada gedung yang cocok" />
                </Card>
              ) : (
                <div className="grid gap-5 *:min-w-0 sm:grid-cols-2 xl:grid-cols-3 lg:gap-7.5">
                  {filtered.map((b) => (
                    <Link key={b.id} to={`/master/buildings/${b.id}`} className="group block">
                      <Card className="h-full transition-shadow group-hover:shadow-md">
                        <CardContent className="flex h-full flex-col gap-4">
                          <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Building2 className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-mono group-hover:text-primary">{b.name}</h3>
                              <p className="line-clamp-2 text-sm text-muted-foreground">{b.address ?? "Alamat belum diisi"}</p>
                            </div>
                          </div>
                          <ul className="space-y-1.5 text-sm text-secondary-foreground">
                            <li className="flex items-center gap-2">
                              <UserRound className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{b.managerName ?? "-"}</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Phone className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{b.phone ?? "-"}</span>
                            </li>
                          </ul>
                          <div className="mt-auto flex gap-5 border-t border-border pt-3.5 text-sm">
                            <span className="flex items-center gap-1.5 text-secondary-foreground">
                              <DoorOpen className="size-4 text-muted-foreground" />
                              <span className="font-semibold text-mono">{b.rooms.length}</span> ruangan
                            </span>
                            <span className="flex items-center gap-1.5 text-secondary-foreground">
                              <Package className="size-4 text-muted-foreground" />
                              <span className="font-semibold text-mono">{b.assetCount}</span> aset
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }
      </Loader>
      <BuildingFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(b) => navigate(`/master/buildings/${b.id}`)}
      />
    </Container>
  );
}

export function BuildingFormDialog({
  building,
  open,
  onOpenChange,
  onSaved,
}: {
  building?: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (building: Building) => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={building ? "Ubah Gedung" : "Tambah Gedung"}
      description={building ? undefined : "Setelah disimpan, Anda bisa langsung menambahkan ruangan."}
      onSubmit={async (v) => {
        const body = {
          name: v.name?.trim(),
          address: orNull(v.address),
          phone: orNull(v.phone),
          managerName: orNull(v.managerName),
        };
        const saved = await api<Building>(building ? `/buildings/${building.id}` : "/buildings", {
          method: building ? "PATCH" : "POST",
          body,
        });
        toast.success(building ? "Gedung berhasil diperbarui" : "Gedung berhasil ditambahkan");
        onOpenChange(false);
        onSaved(saved);
      }}
    >
      <Field label="Nama Gedung" htmlFor="b-name" required>
        <Input id="b-name" name="name" required maxLength={255} defaultValue={building?.name} placeholder="Contoh: Gedung A" />
      </Field>
      <Field label="Alamat" htmlFor="b-address">
        <Textarea id="b-address" name="address" rows={3} defaultValue={building?.address ?? ""} placeholder="Jalan, nomor, kota" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Penanggung Jawab" htmlFor="b-manager">
          <Input id="b-manager" name="managerName" maxLength={255} defaultValue={building?.managerName ?? ""} placeholder="Nama lengkap" />
        </Field>
        <Field label="Nomor Telepon" htmlFor="b-phone">
          <Input
            id="b-phone"
            name="phone"
            type="tel"
            maxLength={32}
            pattern="[0-9+()\-\s]*"
            title="Hanya angka, spasi, +, -, dan tanda kurung"
            defaultValue={building?.phone ?? ""}
            placeholder="Contoh: 021-5551234"
          />
        </Field>
      </div>
    </FormDialog>
  );
}

export function AddressLine({ address }: { address: string | null }) {
  if (!address) return null;
  return (
    <span className="flex items-start gap-1.5">
      <MapPin className="mt-0.5 size-3.5 shrink-0" />
      {address}
    </span>
  );
}
