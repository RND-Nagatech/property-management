import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { TopBar, MobileNav } from "@/components/customer/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";

export const Route = createFileRoute("/akun")({
  head: () => ({ meta: [{ title: "Akun — Stayly" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuth();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
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
          {isLoading ? (
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
