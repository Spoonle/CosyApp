/** Design system — composants Liquid Glass réutilisables. */
import clsx from 'clsx';
import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react';
import { X } from 'lucide-react';

/* ---------- Panneaux ---------- */

export function GlassPanel({
  variant = 'glass',
  className,
  children,
  ...rest
}: {
  variant?: 'glass' | 'glass-ultra' | 'glass-deep' | 'glass-float' | 'surface-solid';
  className?: string;
  children?: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(variant, className)} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Boutons ---------- */

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

export const GlassButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }
>(function GlassButton({ variant = 'default', size = 'md', className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'danger' && 'btn-danger',
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        className
      )}
      {...rest}
    />
  );
});

export function IconButton({
  label,
  className,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }) {
  return (
    <button
      aria-label={label}
      data-tooltip={label}
      className={clsx('btn btn-ghost btn-icon', size === 'sm' && 'btn-sm', className)}
      {...rest}
    />
  );
}

/* ---------- Champs ---------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={clsx('input', className)} spellCheck={false} {...rest} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={clsx('textarea', className)} spellCheck={false} {...rest} />;
  }
);

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx('select', className)} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Interrupteur ---------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
    />
  );
}

/* ---------- Curseur ---------- */

export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  ariaLabel,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      type="range"
      className="slider"
      style={{ '--fill': fill } as React.CSSProperties}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

/* ---------- Chips ---------- */

export function Chip({
  children,
  accent,
  onRemove,
  onClick,
  title,
}: {
  children: ReactNode;
  accent?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <span
      className={clsx('chip', accent && 'chip-accent', onClick && 'chip-button')}
      title={title}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Retirer"
          style={{ display: 'inline-flex', marginLeft: 2, opacity: 0.7 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

/* ---------- Segmented ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Modale ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel glass-float" style={{ width: `min(${width}px, 92vw)` }}>
        <h3>{title}</h3>
        <div className="selectable" style={{ overflowY: 'auto' }}>
          {children}
        </div>
        {footer !== undefined && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- État vide ---------- */

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <div className="empty-title">{title}</div>
      {children !== undefined && <p>{children}</p>}
    </div>
  );
}

/* ---------- Divers ---------- */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="section-title">
      {icon}
      {children}
    </div>
  );
}
