import { supabase } from '../utils/supabaseClient';

export class AuthService {
  static async getSession() {
    return supabase.auth.getSession();
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }

  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => subscription.subscription?.unsubscribe();
  }
}
