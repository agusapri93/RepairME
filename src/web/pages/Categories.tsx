import { useMemo, useState } from "react";
import { EllipsisVertical, Lock, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, nextAssetTag, useApi, type AssetCategory } from "../api";
import {
  Container,
  EmptyState,
  errorText,
  Field,
  FormDialog,
  Loader,
  MobileList,
  MobileListItem,
  orNull,
  PageToolbar,
  SearchInput,
  useConfirm,
} from "../components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTable } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CategoriesPage() {
  const confirm = useConfirm();
  const state = useApi<AssetCategory[]>("/categories");
  const [editing, setEditing] = useState<AssetCategory | "new" | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.data ?? []).filter((c) => !q || [c.name, c.code].some((v) => v.toLowerCase().includes(q)));
  }, [state.data, search]);

  async function remove(category: AssetCategory) {
    const ok = await confirm({
      title: `Hapus kategori ${category.name}?`,
      description: "Kategori ini belum dipakai aset mana pun dan akan dihapus permanen.",
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/categories/${category.id}`, { method: "DELETE" });
      toast.success("Kategori berhasil dihapus");
      await state.reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  const rowActions = (c: AssetCategory) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" mode="icon" size="sm" aria-label={`Aksi untuk ${c.name}`}>
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEditing(c)}>
          <Pencil />
          Ubah
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={c.assetCount > 0} onSelect={() => void remove(c)}>
          <Trash2 />
          {c.assetCount > 0 ? "Hapus (masih dipakai aset)" : "Hapus"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const addButton = (
    <Button onClick={() => setEditing("new")}>
      <Plus />
      Tambah Kategori
    </Button>
  );

  return (
    <Container>
      <PageToolbar
        title="Kategori Aset"
        description="Master data jenis aset. Kode kategori menjadi awalan Asset Tag, misalnya LPT → LPT-0001."
        actions={addButton}
      />
      <Loader state={state}>
        {(categories) =>
          categories.length === 0 ? (
            <Card>
              <EmptyState
                icon={Tags}
                title="Belum ada kategori aset"
                description="Tambahkan jenis aset seperti Laptop, Printer, atau Meja sebelum mengisi data aset."
                action={addButton}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-4">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari jenis aset atau kode…" />
              </CardHeader>
              {filtered.length === 0 ? (
                <EmptyState icon={Tags} title="Tidak ada kategori yang cocok" />
              ) : (
                <>
                <MobileList>
                  {filtered.map((c) => (
                    <MobileListItem
                      key={c.id}
                      title={c.name}
                      subtitle={
                        <>
                          {c.assetCount} aset · berikutnya <span className="font-mono">{nextAssetTag(c)}</span>
                        </>
                      }
                      badges={
                        <Badge variant="secondary" appearance="light" size="md" className="font-mono">
                          {c.code}
                          {c.assetCount > 0 && <Lock className="size-3 text-muted-foreground" aria-label="Kode terkunci" />}
                        </Badge>
                      }
                      aside={rowActions(c)}
                    />
                  ))}
                </MobileList>
                <CardTable className="hidden md:grid">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="ps-5">Jenis Aset</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Asset Tag Berikutnya</TableHead>
                        <TableHead className="text-end">Jumlah Aset</TableHead>
                        <TableHead className="w-12 pe-5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="ps-5">
                            <div className="font-medium text-mono">{c.name}</div>
                            {c.description && (
                              <div className="max-w-md truncate text-xs text-muted-foreground">{c.description}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" appearance="light" size="md" className="font-mono">
                              {c.code}
                              {c.assetCount > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="size-3 text-muted-foreground" aria-label="Kode terkunci" />
                                  </TooltipTrigger>
                                  <TooltipContent>Kode terkunci karena sudah dipakai di Asset Tag</TooltipContent>
                                </Tooltip>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{nextAssetTag(c)}</TableCell>
                          <TableCell className="text-end tabular-nums text-secondary-foreground">{c.assetCount}</TableCell>
                          <TableCell className="pe-5 text-end">{rowActions(c)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardTable>
                </>
              )}
            </Card>
          )
        }
      </Loader>
      <CategoryFormDialog
        // Remount per category so the code field's state follows the row being edited.
        key={editing === null || editing === "new" ? "new" : editing.id}
        category={editing === "new" ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => void state.reload()}
      />
    </Container>
  );
}

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
  onSaved,
}: {
  category?: AssetCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const locked = !!category && category.assetCount > 0;
  const [code, setCode] = useState(category?.code ?? "");

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCode(category?.code ?? "");
        onOpenChange(next);
      }}
      title={category ? "Ubah Kategori Aset" : "Tambah Kategori Aset"}
      onSubmit={async (v) => {
        const body = {
          name: v.name?.trim(),
          // A disabled input isn't submitted, so a locked code is simply left out.
          ...(v.code && { code: v.code.trim().toUpperCase() }),
          description: orNull(v.description),
        };
        await api(category ? `/categories/${category.id}` : "/categories", {
          method: category ? "PATCH" : "POST",
          body,
        });
        toast.success(category ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan");
        onOpenChange(false);
        onSaved();
      }}
    >
      <Field label="Jenis Aset" htmlFor="cat-name" required>
        <Input id="cat-name" name="name" required maxLength={128} defaultValue={category?.name} placeholder="Contoh: Laptop" />
      </Field>
      <Field
        label="Kode"
        htmlFor="cat-code"
        required
        hint={
          locked
            ? "Kode tidak dapat diubah karena sudah dipakai di Asset Tag."
            : code
              ? `Asset Tag akan menjadi ${code.toUpperCase()}-0001, ${code.toUpperCase()}-0002, …`
              : "2–10 huruf atau angka."
        }
      >
        <Input
          id="cat-code"
          name="code"
          required
          pattern="[A-Za-z0-9]{2,10}"
          title="2–10 huruf atau angka"
          maxLength={10}
          value={locked ? category.code : code}
          onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
          placeholder="LPT"
          className="font-mono uppercase"
          disabled={locked}
        />
      </Field>
      <Field label="Deskripsi" htmlFor="cat-desc">
        <Textarea id="cat-desc" name="description" rows={3} defaultValue={category?.description ?? ""} />
      </Field>
    </FormDialog>
  );
}
