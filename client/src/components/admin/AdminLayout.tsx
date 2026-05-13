import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  BedDouble,
  DoorOpen,
  Users,
  Calendar,
  LogIn,
  LogOut as LogOutIcon,
  CreditCard,
  Wallet,
  CalendarRange,
  Wrench,
  Receipt,
  FileBarChart2,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

type Item = { to: string; label: string; icon: React.ElementType };

const groups: { title?: string; items: Item[] }[] = [
  { items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Master Data",
    items: [
      { to: "/admin/tipe-kamar", label: "Tipe Kamar", icon: BedDouble },
      { to: "/admin/kamar", label: "Kamar", icon: DoorOpen },
      { to: "/admin/tamu", label: "Tamu", icon: Users },
    ],
  },
  {
    title: "Transaksi",
    items: [
      { to: "/admin/booking", label: "Booking", icon: Calendar },
      { to: "/admin/check-in", label: "Check-in", icon: LogIn },
      { to: "/admin/check-out", label: "Check-out", icon: LogOutIcon },
      { to: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
      { to: "/admin/deposit", label: "Deposit", icon: Wallet },
    ],
  },
  {
    title: "Operasional",
    items: [
      { to: "/admin/kalender", label: "Kalender", icon: CalendarRange },
      { to: "/admin/kerusakan", label: "Kerusakan", icon: Wrench },
      { to: "/admin/biaya", label: "Biaya Operasional", icon: Receipt },
    ],
  },
  {
    title: "Laporan",
    items: [
      { to: "/admin/laporan-keuangan", label: "Laporan Keuangan", icon: FileBarChart2 },
      { to: "/admin/laporan-booking", label: "Laporan Booking", icon: FileText },
    ],
  },
  {
    title: "Sistem",
    items: [{ to: "/admin/pengaturan", label: "Pengaturan", icon: Settings }],
  },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
              S
            </div>
            <div>
              <div className="text-sm font-bold text-white">Stayly Admin</div>
              <div className="text-[10px] text-sidebar-foreground/60">v2.6</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={gi} className="mb-4">
              {g.title && (
                <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                  {g.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = path === it.to;
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-accent text-accent-foreground" : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="lg:ml-72">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <button onClick={() => setOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Cari booking, tamu, kamar..."
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="relative rounded-xl border border-border p-2.5">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  A
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold leading-tight">Aulia Manager</div>
                  <div className="text-[10px] text-muted-foreground">Admin</div>
                </div>
                <ChevronDown className="hidden md:block h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
