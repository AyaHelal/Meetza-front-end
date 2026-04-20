import { useState, useEffect } from "react";

/** Bumps every 60s so relative timestamps (e.g. "5 min ago") can refresh. */
export function useMinuteTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  return tick;
}
