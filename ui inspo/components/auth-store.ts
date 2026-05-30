"use client";

import { arcFetchMe, arcLogout, arcSignInWithWalletSession } from "./auth-client";

export type MeUser = {
  id: string;
  roles: string[];
  status: string;
  walletAddress: string;
  username?: string | null;
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  profileVisibility?: string;
} | null;

let current: MeUser = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const authStore = {
  getSnapshot(): MeUser {
    return current;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async refresh() {
    current = await arcFetchMe();
    emit();
    return current;
  },
  async signIn(wallet: Parameters<typeof arcSignInWithWalletSession>[0]) {
    current = await arcSignInWithWalletSession(wallet);
    emit();
    return current;
  },
  async logout() {
    await arcLogout();
    current = null;
    emit();
  },
};

