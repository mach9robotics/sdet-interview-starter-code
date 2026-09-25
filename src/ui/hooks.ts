import { createContext, useContext, useEffect, useReducer, useSyncExternalStore } from "react";
import type { App } from "../app/App";
import type { ReadonlySignal, ReadonlySignalValue } from "../signals";

export const AppContext = createContext<App | null>(null);

export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("useApp must be used inside AppContext");
  return app;
}

export function useSignalValue<T>(signal: ReadonlySignalValue<T>): T {
  return useSyncExternalStore(
    (onChange) => {
      const connection = signal.connect(onChange);
      return () => connection.dispose();
    },
    () => signal.value,
  );
}

/** Re-renders whenever `signal` fires. */
export function useSignalTick(signal: ReadonlySignal<unknown>): void {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const connection = signal.connect(tick);
    return () => connection.dispose();
  }, [signal]);
}
