import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";

export function CustomerMenu({ namaLengkap }: { namaLengkap: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm hover:bg-accent/10 transition group min-w-0"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-base uppercase">
          {namaLengkap[0]}
        </div>
        <div className="flex flex-col items-start justify-center min-w-0">
          <span className="font-semibold text-sm text-foreground truncate max-w-[100px]">{namaLengkap}</span>
          <span className="text-xs text-muted-foreground">Customer</span>
        </div>
        <ChevronDown className="ml-1 h-5 w-5 text-muted-foreground group-hover:text-accent" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-popover shadow-lg z-50">
          <Link
            to="/logout"
            className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent/10 rounded-xl transition"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </Link>
        </div>
      )}
    </div>
  );
}
