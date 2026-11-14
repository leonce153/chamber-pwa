/**
 * Chamber PWA data client.
 *
 * This is a small stand-in for the supabase-js client. It keeps the same calling style the
 * screens already use (supabase.from('table').select().eq()...), but every call goes to this
 * site's own PHP API under /api on Hostinger. Nothing talks to Supabase any more.
 *
 * Server-side rules (who can read or change what) live in /server/lib/rest.php.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const API = '/api';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  /** Kept for compatibility with older error handling; always undefined here. */
  context?: any;
}

export interface ApiUser {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  last_sign_in_at?: string | null;
}

interface Session {
  user: ApiUser;
  access_token: string;
}

type Result<T = any> = { data: T; error: ApiError | null; count?: number | null; status?: number };

async function call<T = any>(path: string, body?: unknown, init: RequestInit = {}): Promise<Result<T>> {
  try {
    const res = await fetch(API + path, {
      method: body === undefined && !init.body ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body instanceof FormData || init.body instanceof FormData
        ? { 'X-Requested-With': 'chamber-pwa' }
        : { 'Content-Type': 'application/json', 'X-Requested-With': 'chamber-pwa' },
      body: body instanceof FormData ? body : body === undefined ? init.body : JSON.stringify(body),
      ...init,
    });
    let json: any = null;
    const text = await res.text();
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const message = json?.error?.message ?? json?.error ?? json?.message ?? `Request failed (${res.status})`;
      return { data: (json?.data ?? null) as T, error: { message: String(message), status: res.status, code: json?.error?.code }, status: res.status };
    }
    return { data: (json?.data ?? json) as T, error: null, count: json?.count ?? null, status: res.status };
  } catch (e) {
    return { data: null as T, error: { message: e instanceof Error ? e.message : 'Network error' } };
  }
}

// ===================== Tables =====================

type Filter = [string, string, unknown];

class Query<T = any> implements PromiseLike<Result<T>> {
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private columns = '*';
  private filters: Filter[] = [];
  private orders: [string, boolean][] = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private countMode: string | null = null;
  private head = false;
  private values: unknown = null;
  private returning = false;
  private onConflict: string | null = null;

  constructor(private table: string) {}

  select(columns = '*', opts: { count?: string; head?: boolean } = {}) {
    if (this.action === 'select') {
      this.columns = columns;
      this.countMode = opts.count ?? null;
      this.head = !!opts.head;
    } else {
      this.returning = true;
      this.columns = columns;
    }
    return this;
  }
  insert(values: unknown) {
    this.action = 'insert';
    this.values = values;
    return this;
  }
  upsert(values: unknown, opts: { onConflict?: string } = {}) {
    this.action = 'upsert';
    this.values = values;
    this.onConflict = opts.onConflict ?? null;
    return this;
  }
  update(values: unknown) {
    this.action = 'update';
    this.values = values;
    return this;
  }
  delete() {
    this.action = 'delete';
    return this;
  }
  private f(col: string, op: string, val: unknown) {
    this.filters.push([col, op, val]);
    return this;
  }
  eq(c: string, v: unknown) { return this.f(c, 'eq', v); }
  neq(c: string, v: unknown) { return this.f(c, 'neq', v); }
  gt(c: string, v: unknown) { return this.f(c, 'gt', v); }
  gte(c: string, v: unknown) { return this.f(c, 'gte', v); }
  lt(c: string, v: unknown) { return this.f(c, 'lt', v); }
  lte(c: string, v: unknown) { return this.f(c, 'lte', v); }
  like(c: string, v: unknown) { return this.f(c, 'like', v); }
  ilike(c: string, v: unknown) { return this.f(c, 'ilike', v); }
  is(c: string, v: unknown) { return this.f(c, 'is', v); }
  in(c: string, v: unknown[]) { return this.f(c, 'in', v); }
  not(c: string, op: string, v: unknown) { return this.f(c, 'not_' + op, v); }
  match(obj: Record<string, unknown>) {
    Object.entries(obj).forEach(([k, v]) => this.f(k, 'eq', v));
    return this;
  }
  order(column: string, opts: { ascending?: boolean } = {}) {
    this.orders.push([column, opts.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.limitN = to - from + 1;
    return this;
  }
  single() {
    this.mode = 'single';
    return this as unknown as Query<any>;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this as unknown as Query<any>;
  }

  private run(): Promise<Result<T>> {
    return call<T>('/rest', {
      table: this.table,
      action: this.action,
      columns: this.columns,
      filters: this.filters,
      order: this.orders,
      limit: this.limitN,
      offset: this.rangeFrom,
      mode: this.mode,
      count: this.countMode,
      head: this.head,
      values: this.values,
      returning: this.returning || this.action === 'select',
      on_conflict: this.onConflict,
    });
  }

  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

// ===================== Auth =====================

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | 'INITIAL_SESSION';
type AuthListener = (event: AuthEvent, session: Session | null) => void;

let currentUser: ApiUser | null = null;
const listeners = new Set<AuthListener>();
const toSession = (u: ApiUser | null): Session | null => (u ? { user: u, access_token: 'cookie' } : null);
const emit = (event: AuthEvent) => listeners.forEach((l) => l(event, toSession(currentUser)));

/** Links in invite / reset emails look like  /auth/callback#access_token=XYZ&type=recovery  */
async function boot(): Promise<void> {
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const token = hash.get('access_token');
  if (token) {
    const r = await call<{ user: ApiUser }>('/auth/verify', { token, type: hash.get('type') });
    if (!r.error && r.data?.user) {
      currentUser = r.data.user;
      // A sign-in link from the master dashboard: drop the used token from the address bar
      if (hash.get('type') === 'dashboard') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return;
    }
  }
  const me = await call<{ user: ApiUser | null }>('/auth/me');
  currentUser = me.data?.user ?? null;
}
const ready = typeof window !== 'undefined' ? boot() : Promise.resolve();

const auth = {
  async getUser() {
    await ready;
    return { data: { user: currentUser }, error: null };
  },
  async getSession() {
    await ready;
    return { data: { session: toSession(currentUser) }, error: null };
  },
  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    ready.then(() => cb('INITIAL_SESSION', toSession(currentUser)));
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const r = await call<{ user: ApiUser }>('/auth/login', { email, password });
    if (r.error) return { data: { user: null, session: null }, error: r.error };
    currentUser = r.data.user;
    emit('SIGNED_IN');
    return { data: { user: currentUser, session: toSession(currentUser) }, error: null };
  },
  async signUp(_args: { email: string; password: string; options?: unknown }) {
    return { data: { user: null, session: null }, error: { message: 'Accounts are created by invitation. Ask an owner to invite you.' } as ApiError };
  },
  async signOut() {
    await call('/auth/logout', {});
    currentUser = null;
    emit('SIGNED_OUT');
    return { error: null };
  },
  async resetPasswordForEmail(email: string, opts: { redirectTo?: string } = {}) {
    const r = await call('/auth/recover', { email, redirectTo: opts.redirectTo });
    return { data: {}, error: r.error };
  },
  async updateUser(attrs: { password?: string; data?: Record<string, unknown>; email?: string }) {
    const r = await call<{ user: ApiUser }>('/auth/update', attrs);
    if (r.error) return { data: { user: null }, error: r.error };
    currentUser = r.data.user;
    emit('USER_UPDATED');
    return { data: { user: currentUser }, error: null };
  },
};

// ===================== Storage =====================

function storageBucket(bucket: string) {
  return {
    async upload(path: string, file: Blob, opts: { contentType?: string; upsert?: boolean; cacheControl?: string } = {}) {
      const fd = new FormData();
      fd.append('bucket', bucket);
      fd.append('path', path);
      fd.append('upsert', opts.upsert ? '1' : '0');
      fd.append('file', file);
      const r = await call<{ path: string }>('/storage/upload', fd);
      return { data: r.error ? null : { path: r.data?.path ?? path }, error: r.error };
    },
    getPublicUrl(path: string) {
      const clean = path.split('/').map(encodeURIComponent).join('/');
      return { data: { publicUrl: `${window.location.origin}/storage/v1/object/public/${bucket}/${clean}` } };
    },
    async remove(paths: string[]) {
      const r = await call('/storage/remove', { bucket, paths });
      return { data: r.data, error: r.error };
    },
    async list(prefix = '', opts: { limit?: number } = {}) {
      const r = await call<{ name: string; id: string; created_at: string; metadata: Record<string, unknown> }[]>('/storage/list', { bucket, prefix, limit: opts.limit ?? 1000 });
      return { data: r.data ?? [], error: r.error };
    },
  };
}

// ===================== Server functions =====================

const functions = {
  async invoke<T = any>(name: string, opts: { body?: unknown } = {}) {
    const r = await call<T>('/functions/' + encodeURIComponent(name), opts.body ?? {});
    return { data: r.data, error: r.error };
  },
};

async function rpc<T = any>(name: string, args: Record<string, unknown> = {}) {
  const r = await call<T>('/rpc/' + encodeURIComponent(name), args);
  return { data: r.data, error: r.error };
}

export const supabase = {
  from: <T = any>(table: string) => new Query<T>(table),
  auth,
  storage: { from: storageBucket },
  functions,
  rpc,
};

export type ChamberClient = typeof supabase;
