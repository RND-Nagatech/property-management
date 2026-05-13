import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Daftar — Stayly" }] }),
  component: Register,
});

const steps = ["Akun", "Identitas", "Alamat"];

function Register() {
  const [step, setStep] = useState(0);
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
              <Input label="Nama Lengkap" placeholder="Budi Santoso" />
              <Input label="Email" type="email" placeholder="nama@email.com" />
              <Input label="No. HP" placeholder="08xx xxxx xxxx" />
              <Input label="Password" type="password" placeholder="Minimal 8 karakter" />
              <Input label="Konfirmasi Password" type="password" placeholder="Ulangi password" />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <Input label="NIK" placeholder="16 digit nomor KTP" />
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
                />
              </div>
            </div>
          )}

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
              <Link
                to="/login"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Buat Akun
              </Link>
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
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
