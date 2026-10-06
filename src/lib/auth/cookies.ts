export const COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-mk_session' : 'mk_session';
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
