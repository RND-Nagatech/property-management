import * as React from "react";
import { formatRupiah } from "@/lib/currency";

function digitsOnly(value: string) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

export function parseCurrencyToNumber(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits) : 0;
}

export function CurrencyInput({
  label,
  valueDigits,
  onChangeDigits,
  placeholder = "Rp 0",
  disabled,
  rightSlot,
}: {
  label?: string;
  valueDigits: string; // store only digits ("" allowed)
  onChangeDigits: (nextDigits: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const displayValue = React.useMemo(() => {
    if (!valueDigits) return "";
    const n = Number(valueDigits);
    if (!Number.isFinite(n)) return "";
    return formatRupiah(n);
  }, [valueDigits]);

  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      ) : null}
      <div className="relative">
        <input
          inputMode="numeric"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            const nextDigits = digitsOnly(e.target.value);
            onChangeDigits(nextDigits);
          }}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-accent disabled:opacity-70"
        />
        {rightSlot ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}
      </div>
    </label>
  );
}

