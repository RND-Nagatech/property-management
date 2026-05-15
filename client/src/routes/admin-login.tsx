import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import heroImg from "@/assets/hero-villa.jpg";
import { useSettings } from "@/hooks/useSettings";
import { resolveMediaUrl } from "@/lib/media";
import { apiRequest } from "@/services/api";
import { clearAdminToken, getAdminToken, setAdminToken } from "@/services/admin-auth";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [{ title: "Login Admin" }],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const settingsQuery = useSettings();
  const byKey = new Map((settingsQuery.data ?? []).map((s) => [s.key, s.value] as const));
  const propertyName = String(byKey.get("propertyName") ?? "").trim() || "Properti";
  const logoUrl = resolveMediaUrl(String(byKey.get("logoDataUrl") ?? ""));

  // NOTE:
  // Jangan auto-redirect berdasarkan token yang tersimpan.
  // Token yang expired/invalid bisa menyebabkan loop /admin <-> /admin-login dan halaman berkedip.
  // Redirect hanya dilakukan setelah login berhasil.
  useEffect(() => {
    const token = getAdminToken().trim();
    if (!token || token === "null" || token === "undefined") return;
    // Jika token invalid, bersihkan agar user bisa login normal.
    apiRequest("/admin/auth/me").catch(() => clearAdminToken());
  }, []);
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const redirectToRaw =
    typeof search?.redirectTo === "string" && search.redirectTo ? search.redirectTo : "/admin/";
  const redirectTo = redirectToRaw === "/admin" ? "/admin/" : redirectToRaw;

  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // Autofill may not trigger React onChange, so read from DOM/FormData as source of truth.
      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      const u = String(fd.get("username") ?? usernameRef.current?.value ?? username).trim();
      const p = String(fd.get("password") ?? passwordRef.current?.value ?? password);
      if (!u || !p) {
        setError("Username dan password wajib. Jika terisi otomatis (autofill), coba ketik ulang 1 karakter lalu Masuk.");
        return;
      }
      const res = await apiRequest<{ token: string; admin: any }>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: u, password: p }),
      });
      if (!res?.token) {
        throw new Error("Token login tidak valid");
      }
      setAdminToken(res.token);
      window.location.assign("/admin/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login admin");
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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={propertyName}
                className="h-9 w-9 rounded-lg object-cover bg-white/10"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
                {(propertyName[0] ?? "P").toUpperCase()}
              </div>
            )}
            <span className="font-bold text-lg">{propertyName}</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold">Panel Admin</h2>
            <p className="mt-2 max-w-sm text-white/80">
              Masuk untuk mengelola properti, kamar, booking, dan transaksi.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-8">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={propertyName}
                className="h-8 w-8 rounded-lg object-cover bg-card"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
                {(propertyName[0] ?? "P").toUpperCase()}
              </div>
            )}
            <span className="font-bold">{propertyName}</span>
          </Link>
          <h1 className="text-2xl font-bold">Login Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gunakan username dan password admin.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Silakan isi username admin"
                ref={usernameRef}
                defaultValue={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="mt-1.5 relative">
                <input
                  type={show ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  ref={passwordRef}
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            {error && <div className="text-sm text-destructive">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Masuk Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
