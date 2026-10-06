import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { AuthForm } from '@/features/auth/AuthForm';
export const metadata = { title: 'Entrar' };
export default async function LoginPage() {
  if (await getSession()) redirect('/');
  return <AuthForm />;
}
