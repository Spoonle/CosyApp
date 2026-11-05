/** Widget « Quote ». */
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote as QuoteIcon } from 'lucide-react';
import { quoteOfDay } from '@/data/quotes';

export function QuoteWidget(): ReactNode {
  const [offset, setOffset] = useState(0);
  const quote = quoteOfDay(offset);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 0
      }}
    >
      <QuoteIcon size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="selectable"
          style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', lineHeight: 1.45 }}
        >
          « {quote.text} »
        </div>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
          — {quote.author}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          className="btn btn-ghost btn-sm btn-icon quote-nav"
          style={{ width: 24, height: 22 }}
          aria-label="Citation suivante"
          onClick={() => setOffset((o) => o + 1)}
        >
          <ChevronRight size={13} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-icon quote-nav"
          style={{ width: 24, height: 22 }}
          aria-label="Citation précédente"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft size={13} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Habitudes ---------- */
