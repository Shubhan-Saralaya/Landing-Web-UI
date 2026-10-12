import { useCallback, useEffect, useState } from 'react';
import type { HomeserverData } from '../types';

export type AuthNotice = 'ok' | 'denied' | 'error' | 'cancelled';

export interface AuthState {
  status: 'loading' | 'locked' | 'unlocked';
  email?: string;
  data?: HomeserverData;
  notice?: AuthNotice;
  /** 'password' while the server's TEST login replaces Google. */
  mode?: 'google' | 'password';
}

const NOTICES: AuthNotice[] = ['ok', 'denied', 'error', 'cancelled'];

/** The server redirects back with ?auth=<result> after the Google round-trip; read it once and strip it. */
function takeNoticeFromUrl(): AuthNotice | undefined {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('auth') as AuthNotice | null;
  if (!value) return undefined;
  params.delete('auth');
  const query = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  return NOTICES.includes(value) ? value : undefined;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => ({ status: 'loading', notice: takeNoticeFromUrl() }));

  const refresh = useCallback(async () => {
    const getJson = async (url: string) => {
      const res = await fetch(url, { credentials: 'same-origin' });
      return res.ok ? res.json() : null;
    };
    // Locked visitors still get the map, minus every url — they can see the apps but not open them.
    const lock = async () => {
      const data = (await getJson('/api/homeserver/public').catch(() => null)) as HomeserverData | null;
      setState((s) => ({ ...s, status: 'locked', email: undefined, data: data ?? undefined }));
    };
    try {
      const me = await getJson('/api/me');
      setState((s) => ({ ...s, mode: me?.mode }));
      if (!me?.authenticated) return lock();

      const data = (await getJson('/api/homeserver')) as HomeserverData | null;
      if (!data) return lock();
      setState((s) => ({ ...s, status: 'unlocked', email: me.email, data }));
    } catch {
      // No backend (e.g. plain `vite preview`) — the ship stays locked with sealed placeholder rooms.
      lock();
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  /** TEST ONLY: resolves true on success. */
  const loginWithPassword = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/auth/test-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      refresh();
    }
  }, [refresh]);

  const dismissNotice = useCallback(() => setState((s) => ({ ...s, notice: undefined })), []);

  return { ...state, login, loginWithPassword, logout, dismissNotice };
}

export type Auth = ReturnType<typeof useAuth>;
