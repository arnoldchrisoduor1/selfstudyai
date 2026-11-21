export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
}

export interface ToastApi {
  push: (message: string, tone?: ToastTone) => void;
}
