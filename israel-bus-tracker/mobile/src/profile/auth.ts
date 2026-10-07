import { fail, notImplemented, ok, type Outcome } from '../core/outcome';
import type { AuthProvider, Session, SignInRequest } from './types';

export const AUTH_NOT_IMPLEMENTED_REASON = 'שירות החשבונות עדיין אינו קיים, ולכן אי אפשר להתחבר כרגע. האפליקציה פועלת במצב אורח.';

/** "אמיתי" כשאין שרת חשבונות: המשתמש הוא אורח (זה מצב אמיתי), והתחברות אינה מוטמעת. */
export class RealAuthProvider implements AuthProvider {
  readonly id = 'auth.real';
  readonly isMock = false;
  async getSession(): Promise<Outcome<Session | null>> {
    return ok(null);
  }
  async signIn(_request: SignInRequest): Promise<Outcome<Session>> {
    return notImplemented('auth.signIn', AUTH_NOT_IMPLEMENTED_REASON);
  }
  async signOut(): Promise<Outcome<void>> {
    return ok(undefined);
  }
  subscribe(_listener: () => void): () => void {
    return () => undefined;
  }
}

/** הדגמה בלבד: בזיכרון, בלי אימות. isMock תמיד true והמשתמש רואה תווית הדגמה. */
export class MockAuthProvider implements AuthProvider {
  readonly id = 'auth.mock';
  readonly isMock = true;
  private session: Session | null = null;
  private readonly listeners = new Set<() => void>();

  async getSession(): Promise<Outcome<Session | null>> {
    return ok(this.session);
  }
  async signIn(request: SignInRequest): Promise<Outcome<Session>> {
    const identifier = request.identifier.trim();
    if (identifier.length < 3) return fail('invalid_input', 'identifier too short');
    this.session = { userId: `mock-${identifier}`, displayName: null };
    this.emit();
    return ok(this.session);
  }
  async signOut(): Promise<Outcome<void>> {
    this.session = null;
    this.emit();
    return ok(undefined);
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }
}
