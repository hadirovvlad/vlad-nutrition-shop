import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
};

type ToastState = {
  toasts: Toast[];
  push: (tone: ToastTone, message: string, description?: string) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (tone, message, description) => {
    const id = nextId++;
    // At most three at a time — a wall of toasts is worse than none.
    set({ toasts: [...get().toasts.slice(-2), { id, tone, message, description }] });
    window.setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

/** Imperative helper so services and event handlers can notify without hooks. */
export const toast = {
  success: (message: string, description?: string) =>
    useToastStore.getState().push('success', message, description),
  error: (message: string, description?: string) =>
    useToastStore.getState().push('error', message, description),
  info: (message: string, description?: string) =>
    useToastStore.getState().push('info', message, description),
};
