import { redirect } from 'next/navigation';
import { databaseProblem, getSession } from '@/lib/auth/server';
import { AuthForm } from '@/features/auth/AuthForm';
import { ConfigurationNotice } from '@/components/layout/ConfigurationNotice';
export const metadata = { title: 'Entrar' };
export default async function LoginPage() {
  let signedIn = false;
  try { signedIn = Boolean(await getSession()); }
  catch (error) { const problem = databaseProblem(error); if (!problem) throw error; return <ConfigurationNotice {...problem} />; }
  if (signedIn) redirect('/');
  return <AuthForm />;
}
