"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VISIBLE_MS = 2000;

export function useToast(): {
  readonly message: string | null;
  readonly show: (message: string) => void;
} {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, show };
}
