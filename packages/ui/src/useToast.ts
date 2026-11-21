import { createContext, useContext } from "react";

import type { ToastApi } from "./toast-types";

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast requires ToastProvider");
  }
  return ctx;
}
