/** Notifications internes (toasts) + confirmations destructrices. */
import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, message?: string, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, title, message, durationMs) => {
    const toast: Toast = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      title,
      message
    };
    set((s) => ({ toasts: [...s.toasts.slice(-4), toast] }));
    const duration = durationMs ?? (kind === 'error' ? 6500 : 4200);
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
    }, duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

/** API pratique : toast('success', '…') */
export function toast(kind: ToastKind, title: string, message?: string): void {
  useToastStore.getState().push(kind, title, message);
}

/* ---------- Confirmations ---------- */

export interface ConfirmRequest {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  current: ConfirmRequest | null;
  confirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  current: null,
  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        current: {
          id: `c-${Date.now().toString(36)}`,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Confirmer',
          danger: opts.danger ?? false,
          resolve
        }
      });
    }),
  settle: (ok) => {
    const current = useConfirmStore.getState().current;
    current?.resolve(ok);
    set({ current: null });
  }
}));

/** API pratique : await confirmAction({ ... }) */
export function confirmAction(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return useConfirmStore.getState().confirm(opts);
}
