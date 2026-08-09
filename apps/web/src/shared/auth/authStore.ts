const TOKEN_KEY = 'ea_access_token_v0.1';
const USER_KEY = 'ea_current_user_v0.1';

export interface CachedUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, t);
  } catch {
    // 存储不可用时静默降级
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // 存储不可用时静默降级
  }
}

export function getCachedMe(): CachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedUser;
  } catch {
    return null;
  }
}

export function setCachedMe(u: CachedUser): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {
    // 存储不可用时静默降级
  }
}
