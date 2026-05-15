import * as React from "react";

export function useCountdown(target: Date | number | string | null): [string, number] {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);
  if (!target) return ["", 0];
  const targetTime = typeof target === "number" ? target : new Date(target).getTime();
  let diff = Math.max(0, Math.floor((targetTime - now) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return [m + ":" + String(s).padStart(2, "0"), diff];
}
