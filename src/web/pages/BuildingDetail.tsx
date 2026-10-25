import { useState } from "react";
import { DoorOpen, EllipsisVertical, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { api, formatFloor, useApi, type Building, type Room } from "../api";
import {
  Container,
  EmptyState,
  errorText,
  Field,
  FormDialog,
  InfoList,
  Loader,
  MobileList,
  MobileListItem,
  orNull,
  PageToolbar,
  useConfirm,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTable, CardTitle, CardToolbar } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddressLine, BuildingFormDialog } from "./Buildings";

export function BuildingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const state = useApi<Building>(`/buildings/${id}`);
  const [editingBuilding, setEditingBuilding] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | "new" | null>(null);

  async function deleteBuilding(building: Building) {
    if (building.assetCount > 0) {
      toast.error("Gedung masih memiliki aset. Pindahkan asetnya ke ruangan lain terlebih dahulu.");
      return;
    }
    const ok = await confirm({
      title: `Hapus ${building.name}?`,
      description: `Gedung beserta ${building.rooms.length} ruangannya akan dihapus permanen.`,
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/buildings/${building.id}`, { method: "DELETE" });
      toast.success("Gedung berhasil dihapus");
      navigate("/master/buildings");
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  async function deleteRoom(building: Building, room: Room) {
    const ok = await confirm({ title: `Hapus ruangan ${room.name}?`, confirmLabel: "Hapus", destructive: true });
    if (!ok) return;
    try {
      await api(`/buildings/${building.id}/rooms/${room.id}`, { method: "DELETE" });
      toast.success("Ruangan berhasil dihapus");
      await state.reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  return (
    <Container>
      <Loader state={state}>
        {(building) => {
          const roomActions = (room: Room) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm" aria-label={`Aksi untuk ${room.name}`}>
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditingRoom(room)}>
                  <Pencil />
                  Ubah
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={room.assetCount > 0}
                  onSelect={() => void deleteRoom(building, room)}
                >
                  <Trash2 />
                  {room.assetCount > 0 ? "Hapus (masih ada aset)" : "Hapus"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );

          return (
            <>
              <PageToolbar
                back={{ to: "/master/buildings", label: "Gedung" }}
                title={building.name}
                description={<AddressLine address={building.address} />}
                actions={
                  <>
                    <Button variant="outline" asChild>
                      <Link to={`/assets?building=${building.id}`}>
                        <Package />
                        Lihat Aset
                      </Link>
                    </Button>
                    <Button onClick={() => setEditingBuilding(true)}>
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
                        <DropdownMenuItem variant="destructive" onSelect={() => void deleteBuilding(building)}>
                          <Trash2 />
                          Hapus Gedung
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
              />

              <div className="grid gap-5 *:min-w-0 lg:grid-cols-3 lg:gap-7.5">
                <Card className="self-start">
                  <CardHeader>
                    <CardTitle>Informasi Gedung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-4">
                      {[
                        { label: "Alamat", value: building.address ?? "-" },
                        { label: "Penanggung Jawab", value: building.managerName ?? "-" },
                        {
                          label: "Nomor Telepon",
                          value: building.phone ? (
                            <a href={`tel:${building.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary">
                              {building.phone}
                            </a>
                          ) : (
                            "-"
                          ),
                        },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1">
                          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
                          <dd className="text-sm whitespace-pre-wrap text-mono">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
                      <Stat label="Ruangan" value={building.rooms.length} />
                      <Stat label="Aset" value={building.assetCount} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Ruangan</CardTitle>
                    <CardToolbar>
                      <Button size="sm" onClick={() => setEditingRoom("new")}>
                        <Plus />
                        Tambah Ruangan
                      </Button>
                    </CardToolbar>
                  </CardHeader>
                  {building.rooms.length === 0 ? (
                    <EmptyState
                      icon={DoorOpen}
                      title="Belum ada ruangan"
                      description="Tambahkan ruangan agar gedung ini bisa dipilih sebagai lokasi aset."
                      action={
                        <Button variant="outline" onClick={() => setEditingRoom("new")}>
                          <Plus />
                          Tambah Ruangan
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <MobileList>
                        {building.rooms.map((r) => (
                          <MobileListItem
                            key={r.id}
                            title={r.name}
                            subtitle={[formatFloor(r.floor), `${r.assetCount} aset`].filter(Boolean).join(" · ")}
                            aside={roomActions(r)}
                          />
                        ))}
                      </MobileList>
                      <CardTable className="hidden md:grid">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="ps-5">Nama Ruangan</TableHead>
                              <TableHead>Lantai</TableHead>
                              <TableHead className="text-end">Jumlah Aset</TableHead>
                              <TableHead className="w-12 pe-5" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {building.rooms.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="ps-5 font-medium text-mono">{r.name}</TableCell>
                                <TableCell className="text-secondary-foreground">{formatFloor(r.floor) ?? "-"}</TableCell>
                                <TableCell className="text-end tabular-nums text-secondary-foreground">{r.assetCount}</TableCell>
                                <TableCell className="pe-5 text-end">{roomActions(r)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardTable>
                    </>
                  )}
                </Card>
              </div>

              <BuildingFormDialog
                building={building}
                open={editingBuilding}
                onOpenChange={setEditingBuilding}
                onSaved={() => void state.reload()}
              />
              <RoomFormDialog
                // Remount per room so default values follow the row being edited.
                key={editingRoom === null || editingRoom === "new" ? "new" : editingRoom.id}
                buildingId={building.id}
                room={editingRoom === "new" ? undefined : (editingRoom ?? undefined)}
                open={editingRoom !== null}
                onOpenChange={(open) => !open && setEditingRoom(null)}
                onSaved={() => void state.reload()}
              />
            </>
          );
        }}
      </Loader>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border px-3.5 py-2.5">
      <div className="text-xl font-semibold tabular-nums text-mono">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RoomFormDialog({
  buildingId,
  room,
  open,
  onOpenChange,
  onSaved,
}: {
  buildingId: number;
  room?: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={room ? "Ubah Ruangan" : "Tambah Ruangan"}
      onSubmit={async (v) => {
        const body = { name: v.name?.trim(), floor: orNull(v.floor) };
        await api(room ? `/buildings/${buildingId}/rooms/${room.id}` : `/buildings/${buildingId}/rooms`, {
          method: room ? "PATCH" : "POST",
          body,
        });
        toast.success(room ? "Ruangan berhasil diperbarui" : "Ruangan berhasil ditambahkan");
        onOpenChange(false);
        onSaved();
      }}
    >
      <Field label="Nama Ruangan" htmlFor="r-name" required>
        <Input id="r-name" name="name" required maxLength={128} defaultValue={room?.name} placeholder="Contoh: Ruang Server" />
      </Field>
      <Field label="Lantai" htmlFor="r-floor" hint="Isi angka (mis. 2) atau nama lantai (mis. Basement).">
        <Input id="r-floor" name="floor" maxLength={32} defaultValue={room?.floor ?? ""} placeholder="Contoh: 2" />
      </Field>
    </FormDialog>
  );
}
