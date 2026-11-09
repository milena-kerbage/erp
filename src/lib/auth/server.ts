import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser } from './core';
import { COOKIE_NAME } from './cookies';
import { DatabaseConfigurationError, DatabaseOperationError } from '../database';
// Somente no render atual: nunca compartilha sessões entre requisições/usuários.
export const getSession = cache(async (touch = true) => sessionUser((await cookies()).get(COOKIE_NAME)?.value, touch));
export async function requireSession() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}
/** Falha de banco explicável ao usuário (variável ausente ou conexão indisponível); null para qualquer outro erro. */
export function databaseProblem(error: unknown) {
  if (error instanceof DatabaseConfigurationError) return { title: 'Banco de dados não configurado', message: error.message };
  if (error instanceof DatabaseOperationError) return { title: 'Banco de dados indisponível', message: error.message };
  return null;
}
