import { useCallback, useEffect, useState } from "react";

export function useResendCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now);

  useEffect(() => {
    if (cooldownUntil === null) {
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (now >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const startCooldown = useCallback((seconds: number) => {
    if (seconds > 0) {
      const deadline = Date.now() + seconds * 1000;
      setCurrentTime(Date.now());
      setCooldownUntil(deadline);
    } else {
      setCooldownUntil(null);
    }
  }, []);

  const clearCooldown = useCallback(() => setCooldownUntil(null), []);

  const secondsRemaining =
    cooldownUntil === null
      ? 0
      : Math.max(0, Math.ceil((cooldownUntil - currentTime) / 1000));

  return { secondsRemaining, startCooldown, clearCooldown };
}
