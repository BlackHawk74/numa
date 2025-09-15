// Public mode: no authentication. Provide no-op implementations to avoid type and build errors.
export class AuthService {
  static async getSession() {
    return { data: { session: null }, error: null } as any;
  }

  static async signIn(_email: string, _password: string) {
    return { user: null, session: null } as any;
  }

  static async signUp(_email: string, _password: string) {
    return { user: null, session: null } as any;
  }

  static async signOut() {
    return;
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    // Immediately invoke callback with null session in public mode
    try { callback('INITIAL', null); } catch {}
    return () => {};
  }
}
