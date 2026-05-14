import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { clearAdminToken } from "@/services/admin-auth";

export function AdminMenu({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase">
          {label.slice(0, 1)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold leading-tight">{label}</div>
          <div className="text-[10px] text-muted-foreground">Admin</div>
        </div>
        <ChevronDown className="hidden md:block h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-popover shadow-lg z-50">
          <button
            type="button"
            onClick={() => {
              clearAdminToken();
              setOpen(false);
              navigate({ to: "/admin-login" });
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent/10 rounded-xl transition"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

