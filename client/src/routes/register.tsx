import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type InputHTMLAttributes } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { apiRequest } from "@/services/api";
import { setAuthToken } from "@/services/auth";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Daftar — Stayly" }] }),
  component: Register,
});

const steps = ["Akun", "Identitas", "Alamat"];

function Register() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
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
          nik: form.nik,
          alamat: form.alamat,
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
          <h1 className="text-2xl font-bold">Buat Akun Stayly</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar untuk pengalaman booking yang lebih cepat.
          </p>
        </div>

        {/* Stepper */}
        <div className="mt-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="text-xs font-medium">{s}</div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < step ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
          {step === 0 && (
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
          )}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="NIK"
                placeholder="16 digit nomor KTP"
                value={form.nik}
                onChange={(e) => setForm((p) => ({ ...p, nik: e.target.value }))}
              />
              <div>
                <label className="text-sm font-medium">Jenis Kelamin</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["Laki-laki", "Perempuan"].map((g) => (
                    <label
                      key={g}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                    >
                      <input type="radio" name="g" className="accent-[oklch(0.72_0.15_162)]" />
                      <span className="text-sm font-medium">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Input label="Tanggal Lahir" type="date" />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alamat Lengkap</label>
                <textarea
                  rows={4}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                  value={form.alamat}
                  onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
                />
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Sebelumnya
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Lanjut <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Buat Akun"}
              </button>
            )}
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
