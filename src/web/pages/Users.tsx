import { useMemo, useState } from "react";
import { EllipsisVertical, Pencil, Trash2, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLES, type Role } from "../../shared/constants";
import { api, useApi, type UserRow } from "../api";
import { useUser } from "../auth";
import {
  Container,
  EmptyState,
  errorText,
  Field,
  FilterSelect,
  formatDate,
  FormDialog,
  Loader,
  MobileList,
  MobileListItem,
  PageToolbar,
  SearchInput,
  SelectField,
  StatusDot,
  useConfirm,
} from "../components/common";
import { UserAvatar } from "../components/layout/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTable, CardToolbar } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const roleVariant: Record<Role, "primary" | "info" | "secondary"> = {
  administrator: "primary",
  teknisi: "info",
  pegawai: "secondary",
};

export function UsersPage() {
  const me = useUser();
  const confirm = useConfirm();
  const state = useApi<UserRow[]>("/users");
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.data ?? []).filter(
      (u) => (!role || u.role === role) && (!q || [u.name, u.email].some((v) => v.toLowerCase().includes(q))),
    );
  }, [state.data, search, role]);

  async function setActive(user: UserRow, isActive: boolean) {
    if (!isActive) {
      const ok = await confirm({
        title: `Nonaktifkan ${user.name}?`,
        description: "User tidak akan bisa login sampai diaktifkan kembali. Sesi yang sedang berjalan akan diakhiri.",
        confirmLabel: "Nonaktifkan",
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { isActive } });
      toast.success(isActive ? `${user.name} diaktifkan kembali` : `${user.name} dinonaktifkan`);
      await state.reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  async function remove(user: UserRow) {
    const ok = await confirm({
      title: `Hapus ${user.name}?`,
      description: "Akun akan dihapus permanen. User yang memiliki laporan kerusakan tidak dapat dihapus, nonaktifkan saja.",
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      toast.success("User berhasil dihapus");
      await state.reload();
    } catch (e) {
      const message = errorText(e);
      toast.error(
        message.startsWith("Data masih digunakan")
          ? `${user.name} masih memiliki laporan kerusakan. Nonaktifkan akunnya sebagai gantinya.`
          : message,
      );
    }
  }

  const rowActions = (u: UserRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" mode="icon" size="sm" aria-label={`Aksi untuk ${u.name}`}>
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEditing(u)}>
          <Pencil />
          Ubah
        </DropdownMenuItem>
        {u.id !== me.id && (
          <>
            <DropdownMenuItem onSelect={() => void setActive(u, !u.isActive)}>
              {u.isActive ? <UserX /> : <UserCheck />}
              {u.isActive ? "Nonaktifkan" : "Aktifkan"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void remove(u)}>
              <Trash2 />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Container>
      <PageToolbar
        title="User Management"
        description="Kelola akun dan role pengguna aplikasi."
        actions={
          <Button onClick={() => setEditing("new")}>
            <UserPlus />
            Tambah User
          </Button>
        }
      />
      <Loader state={state}>
        {(users) => (
          <Card>
            <CardHeader className="py-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau email…" />
              <CardToolbar className="w-full sm:w-auto">
                <FilterSelect
                  value={role}
                  onChange={setRole}
                  allLabel="Semua role"
                  options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                />
              </CardToolbar>
            </CardHeader>
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="Tidak ada user yang cocok" description="Coba ubah kata kunci atau filter." />
            ) : (
              <>
              <MobileList>
                {filtered.map((u) => (
                  <MobileListItem
                    key={u.id}
                    title={
                      <span className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} className="size-8 text-xs" />
                        <span className="min-w-0">
                          {u.name}
                          {u.id === me.id && <span className="ms-1 text-xs font-normal text-muted-foreground">(Anda)</span>}
                          <span className="block truncate text-xs font-normal text-muted-foreground">{u.email}</span>
                        </span>
                      </span>
                    }
                    badges={
                      <>
                        <Badge variant={roleVariant[u.role]} appearance="light" size="md">
                          {ROLE_LABELS[u.role]}
                        </Badge>
                        <StatusDot variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Aktif" : "Nonaktif"}</StatusDot>
                      </>
                    }
                    aside={rowActions(u)}
                  />
                ))}
              </MobileList>
              <CardTable className="hidden md:grid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-5">User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="w-12 pe-5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="ps-5">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} />
                            <div className="min-w-0">
                              <div className="font-medium text-mono">
                                {u.name}
                                {u.id === me.id && <span className="ms-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleVariant[u.role]} appearance="light" size="md">
                            {ROLE_LABELS[u.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusDot variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Aktif" : "Nonaktif"}</StatusDot>
                        </TableCell>
                        <TableCell className="text-secondary-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="pe-5 text-end">{rowActions(u)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardTable>
              <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Menampilkan {filtered.length} dari {users.length} user
              </div>
              </>
            )}
          </Card>
        )}
      </Loader>
      <UserFormDialog
        // Remount per user so default values follow the row being edited.
        key={editing === null || editing === "new" ? "new" : editing.id}
        user={editing === "new" ? undefined : (editing ?? undefined)}
        isSelf={editing !== null && editing !== "new" && editing.id === me.id}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => void state.reload()}
      />
    </Container>
  );
}

function UserFormDialog({
  user,
  isSelf,
  open,
  onOpenChange,
  onSaved,
}: {
  user?: UserRow;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? "Ubah User" : "Tambah User"}
      onSubmit={async (v) => {
        const body = {
          name: v.name?.trim(),
          email: v.email?.trim(),
          // Disabled fields are not submitted, so keep the current values for yourself.
          role: v.role ?? user?.role,
          isActive: isSelf ? true : v.isActive === "on",
          ...(v.password && { password: v.password }),
        };
        await api(user ? `/users/${user.id}` : "/users", { method: user ? "PATCH" : "POST", body });
        toast.success(user ? "User berhasil diperbarui" : "User berhasil ditambahkan");
        onOpenChange(false);
        onSaved();
      }}
    >
      <Field label="Nama" htmlFor="user-name" required>
        <Input id="user-name" name="name" required maxLength={255} defaultValue={user?.name} />
      </Field>
      <Field label="Email" htmlFor="user-email" required>
        <Input id="user-email" name="email" type="email" required maxLength={255} defaultValue={user?.email} />
      </Field>
      <Field
        label="Password"
        htmlFor="user-password"
        required={!user}
        hint={user ? "Kosongkan jika tidak ingin mengubah password." : "Minimal 8 karakter."}
      >
        <Input
          id="user-password"
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          required={!user}
          autoComplete="new-password"
        />
      </Field>
      <Field
        label="Role"
        htmlFor="user-role"
        required
        hint={isSelf ? "Anda tidak dapat mengubah role akun sendiri." : undefined}
      >
        <SelectField
          id="user-role"
          name="role"
          required
          disabled={isSelf}
          defaultValue={user?.role ?? "pegawai"}
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      </Field>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
        <div className="space-y-0.5">
          <Label htmlFor="user-active">Akun aktif</Label>
          <p className="text-xs text-muted-foreground">
            {isSelf ? "Anda tidak dapat menonaktifkan akun sendiri." : "User nonaktif tidak dapat login."}
          </p>
        </div>
        <Switch id="user-active" name="isActive" defaultChecked={user?.isActive ?? true} disabled={isSelf} />
      </div>
    </FormDialog>
  );
}
