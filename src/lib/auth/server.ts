import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { developmentAccess } from './environment';
import { sessionUser } from './core';
import { COOKIE_NAME } from './cookies';
export async function getSession(touch = true) { return await sessionUser((await cookies()).get(COOKIE_NAME)?.value, touch); }
export async function requireSession() {
  const user = await getSession();
  if (!user && developmentAccess()) return { id: 'user-milena', name: 'Milena Kerbage', email: 'milena@example.com' };
  if (!user) redirect('/login');
  return user;
}
