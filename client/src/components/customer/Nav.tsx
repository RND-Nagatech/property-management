import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BedDouble, Calendar, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";
import { ChevronDown } from "lucide-react";
import { CustomerMenu } from "@/components/customer/CustomerMenu";
import { useSettings } from "@/hooks/useSettings";
import { resolveMediaUrl } from "@/lib/media";

function getNavItems() {
  return [
    { to: "/", label: "Beranda", icon: Home },
    { to: "/booking-saya", label: "Booking Saya", icon: Calendar },
    { to: "/kamar", label: "Kamar", icon: BedDouble },
    { to: "/akun", label: "Akun", icon: User },
  ];
}

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = getNavItems();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border glass md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link to={it.to} className="flex flex-col items-center gap-1 py-2.5">
                <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-muted-foreground"}`} />
                <span
                  className={`text-[11px] font-medium ${active ? "text-accent" : "text-muted-foreground"}`}
                >
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopBar() {
  const isLoggedIn = useAuth();
  const { data: me } = useMe();
  const settings = useSettings();
  const byKey = (() => {
    const map = new Map<string, unknown>();
    for (const s of settings.data ?? []) map.set(s.key, s.value);
    return map;
  })();
  const propertyName = String(byKey.get("propertyName") ?? "").trim() || "Properti";
  const logo = resolveMediaUrl(String(byKey.get("logoDataUrl") ?? "").trim());
  const initial = propertyName.trim().slice(0, 1).toUpperCase() || "P";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navItems = [
    { to: "/", label: "Beranda", icon: Home },
    { to: "/booking-saya", label: "Booking Saya", icon: Calendar },
    { to: "/kamar", label: "Kamar", icon: BedDouble },
    { to: "/akun", label: "Akun", icon: User },
  ];
  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
              {initial}
            </div>
          )}
          <span className="text-base font-bold tracking-tight">{propertyName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((it) => {
            const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${active ? "text-accent bg-accent/10" : "hover:text-accent"}`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-muted-foreground"}`} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {me?.namaLengkap && <CustomerMenu namaLengkap={me.namaLengkap} />}
            </>
          ) : (
            <>
              <Link to="/login" className="inline-flex text-sm font-medium hover:text-accent">
                Masuk
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
