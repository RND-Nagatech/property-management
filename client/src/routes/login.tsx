import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import heroImg from "@/assets/hero-villa.jpg";
import { apiRequest } from "@/services/api";
import { setAuthToken } from "@/services/auth";
import { useSettings } from "@/hooks/useSettings";
import { resolveMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk" },
      { name: "description", content: "Masuk ke akun Anda." },
    ],
  }),
  component: Login,
});

function Login() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const settings = useSettings();
  const byKey = (() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  })();
  const propertyName = String(byKey.get("propertyName") ?? "").trim() || "Properti";
  const logo = resolveMediaUrl(String(byKey.get("logoDataUrl") ?? "").trim());
  const initial = propertyName.trim().slice(0, 1).toUpperCase() || "P";
  const search = Route.useSearch() as any;
  const redirectTo = typeof search?.redirectTo === "string" && search.redirectTo ? search.redirectTo : "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; customer: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      setAuthToken(res.token, { persist: remember });
      navigate({ to: redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 to-primary/30" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
              {logo ? (
                <img src={logo} alt="" className="h-5 w-5 rounded-sm object-contain" />
              ) : (
                initial
              )}
            </div>
            <span className="font-bold text-lg">{propertyName}</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold">Selamat datang kembali</h2>
            <p className="mt-2 max-w-sm text-white/80">
              Lanjutkan perjalanan Anda dan temukan tempat menginap yang nyaman.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
              {logo ? (
                <img src={logo} alt="" className="h-5 w-5 rounded-sm object-contain" />
              ) : (
                initial
              )}
            </div>
            <span className="font-bold">{propertyName}</span>
          </Link>
          <h1 className="text-2xl font-bold">Masuk ke akun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selamat datang kembali, silakan masuk.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Input
              label="Email atau No. HP"
              type="text"
              placeholder="nama@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="mt-1.5 relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-[oklch(0.72_0.15_162)]"
                />
                Ingat saya
              </label>
              <a href="#" className="text-sm font-medium text-accent">
                Lupa password?
              </a>
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <button className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90">
              {submitting ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link to="/register" className="font-semibold text-accent">
              Daftar sekarang
            </Link>
          </p>
        </div>
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
        className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
