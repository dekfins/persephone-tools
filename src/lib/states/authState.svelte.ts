import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabaseClient';
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
  usernameError = $state<string | null>(null);
  shouldPromptUsername = $state(false);
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
      this.shouldPromptUsername = false;
      this.usernameError = null;
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
    const email = user.email ?? '';
    const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null;
    const generatedDisplayName = typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : email || null;

    const existingProfile = await supabase
      .from('profiles')
      .select('id,email,display_name,avatar_url,created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile.error) {
      this.authError = `Profile sync failed: ${existingProfile.error.message}`;
      return null;
    }

    if (!existingProfile.data) {
      const profile: ProfileRecord = {
        id: user.id,
        email,
        display_name: generatedDisplayName,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profile)
        .select()
        .single();

      if (error) {
        this.authError = `Profile sync failed: ${error.message}`;
        return null;
      }

      this.shouldPromptUsername = true;
      return data as ProfileRecord;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ email, avatar_url: avatarUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      this.authError = `Profile sync failed: ${error.message}`;
      return null;
    }

    return data as ProfileRecord;
  }

  async updateUsername(displayName: string): Promise<boolean> {
    if (!this.user) {
      this.usernameError = 'Sign in before changing username.';
      return false;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      this.usernameError = 'Username cannot be blank.';
      return false;
    }

    this.usernameError = null;

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName })
      .eq('id', this.user.id)
      .select()
      .single();

    if (error) {
      this.usernameError = `Username update failed: ${error.message}`;
      return false;
    }

    this.profile = data as ProfileRecord;
    dbState.setActiveUserProfile(this.profile);
    this.shouldPromptUsername = false;
    return true;
  }
}

export const authState = new AuthStateManager();
