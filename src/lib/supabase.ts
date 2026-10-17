// Projeto Supabase usado como banco do ERP.
// O servidor acessa o PostgreSQL por DATABASE_URL (esquemas privados erp_*, fora da Data API); não há
// cliente supabase-js, chave anon/publishable ou service_role. SUPABASE_PROJECT_ID e SUPABASE_URL são
// identificadores públicos usados só para impedir que o app aponte para outro projeto por engano.
// Mensagens de erro citam apenas NOMES de variáveis, nunca valores.

const PROJECT_REF = /^[a-z0-9]{20}$/;
const PROJECT_HOST = /^([a-z0-9]{20})\.supabase\.co$/;

type Environment = Record<string, string | undefined>;

export function supabaseProject(environment: Environment = process.env) {
  const problems: string[] = [];
  const declared = environment.SUPABASE_PROJECT_ID?.trim();
  const address = environment.SUPABASE_URL?.trim();
  let fromUrl: string | undefined;
  if (declared && !PROJECT_REF.test(declared)) problems.push('SUPABASE_PROJECT_ID deve ter 20 caracteres (letras minúsculas e números).');
  if (address) {
    try {
      const url = new URL(address);
      const match = PROJECT_HOST.exec(url.hostname);
      if (url.protocol !== 'https:' || !match || url.username || url.password || url.port || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) throw new Error();
      fromUrl = match[1];
    } catch { problems.push('SUPABASE_URL deve ter o formato https://<project-id>.supabase.co.'); }
  }
  if (declared && fromUrl && declared !== fromUrl) problems.push('SUPABASE_URL e SUPABASE_PROJECT_ID apontam para projetos diferentes.');
  const projectId = problems.length ? undefined : declared || fromUrl;
  return { projectId, problems };
}

/** Confere se a conexão PostgreSQL pertence ao projeto Supabase configurado. */
export function databaseTargetProblems(connectionString: string, environment: Environment = process.env): string[] {
  const { projectId, problems } = supabaseProject(environment);
  if (problems.length) return problems;
  if (!projectId) return [];
  try {
    const url = new URL(connectionString);
    const user = decodeURIComponent(url.username);
    const pooler = url.hostname.endsWith('.pooler.supabase.com');
    if (pooler && user === `postgres.${projectId}`) return [];
    if (url.hostname === `db.${projectId}.supabase.co`) return [];
  } catch { /* Formato inválido é tratado por quem abre a conexão. */ }
  return ['DATABASE_URL não pertence ao projeto Supabase de SUPABASE_PROJECT_ID. Use a conexão do Transaction Pooler desse projeto (usuário postgres.<project-id>).'];
}

/** Nomes (nunca valores) das variáveis relevantes que estão definidas, para diagnóstico. */
export function environmentPresence(names: readonly string[], environment: Environment = process.env) {
  return Object.fromEntries(names.map(name => [name, Boolean(environment[name]?.trim())]));
}
