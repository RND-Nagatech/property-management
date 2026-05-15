import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type InputHTMLAttributes } from "react";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/services/api";
import { setAuthToken } from "@/services/auth";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Daftar" }] }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const settings = useSettings();
  const byKey = (() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  })();
  const propertyName = String(byKey.get("propertyName") ?? "").trim() || "Properti";
  const search = Route.useSearch() as any;
  const redirectTo = typeof search?.redirectTo === "string" && search.redirectTo ? search.redirectTo : "/";

  const [form, setForm] = useState({
    namaLengkap: "",
    email: "",
    noHp: "",
    password: "",
    confirmPassword: "",
    nik: "",
    alamat: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!form.namaLengkap || !form.email || !form.noHp || !form.password) {
      setError("Mohon lengkapi data akun.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; customer: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          namaLengkap: form.namaLengkap,
          email: form.email,
          noHp: form.noHp,
          password: form.password,
          // MVP: step 2/3 optional
        }),
      });
      setAuthToken(res.token);
      navigate({ to: redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal daftar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="mt-6">
          <h1 className="text-2xl font-bold">Buat Akun {propertyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar untuk pengalaman booking yang lebih cepat.
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="space-y-4">
            <Input
              label="Nama Lengkap"
              placeholder="Budi Santoso"
              value={form.namaLengkap}
              onChange={(e) => setForm((p) => ({ ...p, namaLengkap: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              label="No. HP"
              placeholder="08xx xxxx xxxx"
              value={form.noHp}
              onChange={(e) => setForm((p) => ({ ...p, noHp: e.target.value }))}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <Input
              label="Konfirmasi Password"
              type="password"
              placeholder="Ulangi password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

          <div className="mt-6 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Buat Akun"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-accent">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
