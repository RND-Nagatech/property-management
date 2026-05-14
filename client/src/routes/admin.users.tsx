import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Modal, Input } from "./admin.tipe-kamar";
import { Plus, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  type AdminUser,
} from "@/hooks/useAdminUsers";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Kelola User Admin" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const users = useAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();

  const list = useMemo(() => users.data ?? [], [users.data]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ username: "", nama: "", password: "", isActive: true });

  function openAdd() {
    setEditing(null);
    setForm({ username: "", nama: "", password: "", isActive: true });
    setOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({ username: u.username, nama: u.nama ?? "", password: "", isActive: u.isActive });
    setOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    try {
      if (!form.username.trim()) {
        toast.error("Username wajib diisi");
        return;
      }
      if (!editing && !form.password) {
        toast.error("Password wajib diisi");
        return;
      }
      if (editing) {
        await updateUser.mutateAsync({
          id: editing._id,
          payload: {
            nama: form.nama,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast.success("User admin diperbarui");
      } else {
        await createUser.mutateAsync({
          username: form.username.trim(),
          nama: form.nama.trim(),
          password: form.password,
        });
        toast.success("User admin ditambahkan");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan user admin");
    }
  }

  async function toggleActive(u: AdminUser) {
    try {
      await updateUser.mutateAsync({ id: u._id, payload: { isActive: !u.isActive } });
      toast.success(u.isActive ? "User dinonaktifkan" : "User diaktifkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status user");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Kelola User Admin" desc="Buat & atur akses user admin">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </button>
      </PageHeader>

      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] overflow-x-auto">
        {users.isLoading && <div className="text-sm text-muted-foreground">Memuat user...</div>}
        {users.isError && (
          <div className="text-sm text-destructive">
            {users.error instanceof Error ? users.error.message : "Gagal memuat user"}
          </div>
        )}
        {!users.isLoading && !users.isError && list.length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada user admin.</div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="pb-3 font-semibold">Username</th>
              <th className="pb-3 font-semibold">Nama</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((u) => (
              <tr key={u._id} className="hover:bg-secondary/40">
                <td className="py-3.5 font-mono text-xs font-bold">{u.username}</td>
                <td className="py-3.5 font-medium">{u.nama || "-"}</td>
                <td className="py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      u.isActive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="py-3.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      className={`rounded-lg border border-border p-1.5 ${
                        u.isActive ? "text-destructive" : "text-accent"
                      }`}
                      title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {u.isActive ? (
                        <ShieldX className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="rounded-lg border border-border p-1.5"
                      title="Edit"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editing ? "Edit User Admin" : "Tambah User Admin"} onClose={() => setOpen(false)}>
          <form onSubmit={onSave} className="space-y-4">
            <Input
              label="Username"
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              placeholder="rnd"
            />
            {editing && (
              <div className="text-xs text-muted-foreground">
                Username tidak bisa diubah.
              </div>
            )}
            <Input
              label="Nama"
              value={form.nama}
              onChange={(v) => setForm({ ...form, nama: v })}
              placeholder="RND"
            />
            <Input
              label={editing ? "Password Baru (opsional)" : "Password"}
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="Minimal 6 karakter"
            />
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
