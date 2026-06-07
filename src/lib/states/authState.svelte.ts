import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { ProfileRecord } from '../types';
import { dbState } from './dbState.svelte';

export const PENDING_INVITE_KEY = 'DEIMOS_PENDING_INVITE_CODE';

class AuthStateManager {
  session = $state<Session | null>(null);
  user = $state<User | null>(null);
  profile = $state<ProfileRecord | null>(null);
  isInitializing = $state(true);
  isSigningIn = $state(false);
  authError = $state<string | null>(null);
  #isInitialized = false;

  get isSignedIn() {
    return Boolean(this.user);
  }

  async initialize() {
    if (this.#isInitialized) return;
    this.#isInitialized = true;
    this.isInitializing = true;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      this.authError = error.message;
    }

    await this.applySession(data.session ?? null);

    supabase.auth.onAuthStateChange((_event, session) => {
      void this.applySession(session);
    });

    this.isInitializing = false;
  }

  async signInWithGoogle() {
    this.isSigningIn = true;
    this.authError = null;

    const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
    const redirectTo = pendingInvite
      ? `${window.location.origin}/invite/${encodeURIComponent(pendingInvite)}`
      : `${window.location.origin}/home`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) {
      this.authError = error.message;
      this.isSigningIn = false;
    }
  }

  async signOut() {
    this.authError = null;
    const { error } = await supabase.auth.signOut();
    if (error) {
      this.authError = error.message;
      return;
    }

    await this.applySession(null);
    window.location.href = '/login';
  }

  async applySession(session: Session | null) {
    this.session = session;
    this.user = session?.user ?? null;

    if (!this.user) {
      this.profile = null;
      dbState.clearForSignedOut();
      return;
    }

    this.profile = await this.upsertProfile(this.user);
    dbState.setActiveUserProfile(this.profile);
    await dbState.loadData();
    dbState.subscribeToChanges();

    const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
    if (pendingInvite && !window.location.pathname.startsWith('/invite/')) {
      window.location.href = `/invite/${encodeURIComponent(pendingInvite)}`;
    }
  }

  async upsertProfile(user: User): Promise<ProfileRecord | null> {
    const metadata = user.user_metadata ?? {};
    const profile: ProfileRecord = {
      id: user.id,
      email: user.email ?? '',
      display_name: typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : user.email ?? null,
      avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      this.authError = `Profile sync failed: ${error.message}`;
      return null;
    }

    return data as ProfileRecord;
  }
}

export const authState = new AuthStateManager();
