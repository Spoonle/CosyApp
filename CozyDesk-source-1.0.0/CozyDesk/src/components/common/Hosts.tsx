/** Hôtes : toasts, confirmations, erreurs globales. */
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useToastStore, useConfirmStore } from '@/stores/toast';
import { GlassButton } from '@/components/glass';

/* ---------- Toasts ---------- */

const TOAST_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
} as const;

export function Toaster(): ReactNode {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.kind];
        return (
          <div key={t.id} className={`toast glass-float anim-toast toast-${t.kind}`}>
            <span className="toast-icon">
              <Icon size={17} />
            </span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button className="toast-close" aria-label="Fermer" onClick={() => dismiss(t.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Confirmations ---------- */

export function ConfirmDialogHost(): ReactNode {
  const current = useConfirmStore((s) => s.current);
  const settle = useConfirmStore((s) => s.settle);
  if (!current) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel glass-float anim-pop" role="alertdialog" aria-label={current.title}>
        <h3>{current.title}</h3>
        <p className="text-secondary selectable" style={{ fontSize: 'var(--text-base)' }}>
          {current.message}
        </p>
        <div className="modal-actions">
          <GlassButton variant="ghost" onClick={() => settle(false)}>
            Annuler
          </GlassButton>
          <GlassButton
            variant={current.danger ? 'danger' : 'primary'}
            autoFocus
            onClick={() => settle(true)}
          >
            {current.confirmLabel}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- Erreurs globales ---------- */

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[cozydesk] erreur de rendu :', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
        >
          <div className="glass-float" style={{ padding: 28, maxWidth: 480 }}>
            <h3 style={{ marginBottom: 10 }}>Une erreur inattendue est survenue</h3>
            <p className="text-secondary" style={{ marginBottom: 6 }}>
              L’interface a rencontré un problème et n’a pas pu continuer à s’afficher. Vos données
              sont conservées localement.
            </p>
            <p className="text-muted selectable" style={{ fontSize: 12, marginBottom: 16 }}>
              {this.state.error.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GlassButton variant="ghost" onClick={() => this.setState({ error: null })}>
                Réessayer
              </GlassButton>
              <GlassButton variant="primary" onClick={() => window.location.reload()}>
                Recharger CozyDesk
              </GlassButton>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
