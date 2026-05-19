import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { TopBar, MobileNav } from "@/components/customer/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export const Route = createFileRoute("/akun")({
  head: () => ({ meta: [{ title: "Akun" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuth();
  const qc = useQueryClient();
  const meQuery = useMe();
  const me = meQuery.data;

  const [editOpen, setEditOpen] = React.useState(false);
  const [namaLengkap, setNamaLengkap] = React.useState("");
  const [noHp, setNoHp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (!me) return;
    setNamaLengkap(String(me.namaLengkap ?? ""));
    setNoHp(String(me.noHp ?? ""));
    setEmail(String(me.email ?? ""));
    setPassword("");
  }, [me?.namaLengkap, me?.noHp, me?.email, me?._id]);

  const updateMe = useMutation({
    mutationFn: async (payload: { namaLengkap: string; noHp: string; email: string; password?: string }) =>
      apiRequest<any>("/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (updated) => {
      qc.setQueryData(["auth", "me"], updated);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setPassword("");
      setEditOpen(false);
    },
  });

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: "/login", search: { redirectTo: "/akun" } as any });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <TopBar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Akun Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola informasi akun Anda.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          {meQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Memuat data akun...</div>
          ) : (
            <div className="grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nama Lengkap</span>
                <span className="font-medium text-foreground">{me?.namaLengkap ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{me?.email ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">No. HP</span>
                <span className="font-medium text-foreground">{me?.noHp ?? "-"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Edit Data</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Password opsional. Jika kosong, password lama tetap digunakan.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10"
              onClick={() => {
                setError("");
                setEditOpen((v) => !v);
              }}
            >
              {editOpen ? "Tutup" : "Edit Data"}
            </button>
          </div>

          {editOpen && (
            <form
              className="mt-5 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                const payload = {
                  namaLengkap: namaLengkap.trim(),
                  noHp: noHp.trim(),
                  email: email.trim().toLowerCase(),
                  ...(password ? { password } : {}),
                };
                if (!payload.namaLengkap || !payload.noHp || !payload.email) {
                  setError("Nama, No. HP, dan Email wajib diisi.");
                  return;
                }
                updateMe.mutate(payload, {
                  onError: (err) => {
                    setError(err instanceof Error ? err.message : "Gagal memperbarui data");
                  },
                });
              }}
            >
              <div>
                <label className="text-sm font-medium">Nama</label>
                <input
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor HP</label>
                <input
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password Baru (Opsional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diganti"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}
              <button
                type="submit"
                disabled={updateMe.isPending}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {updateMe.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link
            to="/logout"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10"
          >
            Logout
          </Link>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
