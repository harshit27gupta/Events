import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type JwtPayload = { userId: string; email: string; role?: 'user' | 'organizer' | 'admin'; jti?: string };

export function signAccessToken(payload: Omit<JwtPayload, 'jti'>, secret: string, expiresInSeconds: number) {
  const options: SignOptions = { expiresIn: expiresInSeconds };
  return jwt.sign(payload as object, secret as Secret, options);
}

export function verifyToken<T extends object = any>(token: string, secret: string): T {
  return jwt.verify(token, secret) as unknown as T;
}

export function bearerFromAuthHeader(header: string | undefined | null) {
  const value = header || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export function setCookie(res: Response, name: string, value: string, opts: { domain?: string; secure?: boolean; maxAgeMs?: number; path?: string; httpOnly?: boolean; sameSite?: 'lax' | 'strict' | 'none' }) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.maxAgeMs) parts.push(`Max-Age=${Math.floor(opts.maxAgeMs / 1000)}`);
  if (opts.secure) parts.push('Secure');
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  const sameSite = (opts.sameSite || 'lax').toLowerCase();
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  res.setHeader('Set-Cookie', [...(Array.isArray(res.getHeader('Set-Cookie')) ? (res.getHeader('Set-Cookie') as string[]) : []), parts.join('; ')]);
}

export function clearCookie(res: Response, name: string, opts?: { domain?: string; path?: string }) {
  const parts = [`${name}=; Max-Age=0`];
  parts.push(`Path=${opts?.path || '/'}`);
  if (opts?.domain) parts.push(`Domain=${opts.domain}`);
  parts.push('HttpOnly');
  res.setHeader('Set-Cookie', [...(Array.isArray(res.getHeader('Set-Cookie')) ? (res.getHeader('Set-Cookie') as string[]) : []), parts.join('; ')]);
}

export function cookieBridgeMiddleware(secret: string) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth) {
      const cookies = parseCookies(req.headers['cookie'] as string | undefined);
      const token = cookies['access_token'];
      if (token) {
        try {
          verifyToken(token, secret);
          req.headers['authorization'] = `Bearer ${token}`;
        } catch {
          // ignore invalid cookies
        }
      }
    }
    next();
  };
}

export function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const p of pairs) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = decodeURIComponent(p.slice(idx + 1).trim());
    out[k] = v;
  }
  return out;
}


