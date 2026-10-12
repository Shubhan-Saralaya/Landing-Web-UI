import { useEffect } from 'react';
import type { AuthNotice } from '../hooks/useAuth';

const MESSAGES: Record<AuthNotice, { text: string; tone: 'ok' | 'warn' }> = {
  ok: { text: 'Clearance granted. Airlock open.', tone: 'ok' },
  denied: { text: 'Access denied: account not on the clearance list.', tone: 'warn' },
  error: { text: 'Clearance check failed. Try again.', tone: 'warn' },
  cancelled: { text: 'Clearance request cancelled.', tone: 'warn' },
};

export function Toast({ notice, onDismiss }: { notice: AuthNotice; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(t);
  }, [notice, onDismiss]);

  const m = MESSAGES[notice];
  return (
    <div className={`toast toast-${m.tone}`} role="status">
      <span>{m.text}</span>
      <button onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
