'use client';
import { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Page, PageHeader } from '@/features/settings/components/ui';

const Panel = styled.section`
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 1rem;
  display: grid;
  gap: 1rem;
  h2 { font-size: 1.1rem; }
  dl { display: grid; gap: 1rem; }
  dt { font-weight: 600; margin-bottom: .25rem; }
  dd, code { overflow-wrap: anywhere; font-size: .875rem; }
  ul { padding-left: 1.25rem; }
`;
const Actions = styled.div`display: flex; flex-wrap: wrap; gap: .75rem;`;
type Status = {
  urls: Record<string, string>; checks: { name: string; configured: boolean }[]; scopes: string[]; retentionDays: number;
  connection: { username: string; expiresAt: string; expired: boolean; scopes: string[]; subscribedFields: string[] } | null;
  events: { total: number; lastReceivedAt: string | null };
};
const labels: Record<string, string> = { redirect: 'URL de redirecionamento do login', deauthorize: 'URL de desautorização', dataDeletion: 'URL de exclusão de dados (callback)', webhook: 'URL do webhook', privacy: 'Política de privacidade', terms: 'Termos de uso', deletionInstructions: 'Instruções de exclusão de dados' };
async function api(path: string, mutation = false) {
  const response = await fetch(`/api/instagram/${path}`, { method: mutation ? 'POST' : 'GET', cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
  return body;
}
export function InstagramSettings() {
  const [status, setStatus] = useState<Status | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [verifyToken, setVerifyToken] = useState('');
  const load = useCallback(async () => { setStatus(await api('status')); }, []);
  useEffect(() => {
    load().catch(error => setMessage(error.message));
    const outcome = new URLSearchParams(window.location.search).get('instagram');
    if (outcome) {
      setMessage(outcome === 'connected' ? 'Conta conectada. Habilite as notificações para começar a receber eventos.' : outcome === 'denied' ? 'A autorização foi cancelada no Instagram.' : 'Não foi possível concluir o login. Confira a configuração e inicie uma nova conexão.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [load]);
  async function act(action: string) {
    setBusy(true); setMessage('');
    try {
      const body = await api(action, true);
      if (body.authorizationUrl) { window.location.assign(body.authorizationUrl); return; }
      if (body.verifyToken) setVerifyToken(body.verifyToken);
      else { await load(); setMessage('Operação concluída.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Operação indisponível.'); }
    finally { setBusy(false); }
  }
  return <Page>
    <PageHeader title="Instagram" description="Conexão oficial do perfil do Ateliê e recebimento de eventos." />
    <Button variant="secondary" href="/configuracoes/integracoes">Integrações</Button>
    {message && <p role="status">{message}</p>}
    <Panel><h2>Conta do Instagram</h2>
      {status?.connection ? <><p>@{status.connection.username} · {status.connection.expired ? 'Token expirado' : 'Conectada'}</p><p>Validade do token: {new Date(status.connection.expiresAt).toLocaleString('pt-BR')}</p><p>Notificações habilitadas: {status.connection.subscribedFields.join(', ') || 'Nenhuma'}</p></> : <p>Nenhuma conta conectada por este aplicativo.</p>}
      <Actions>
        <Button disabled={busy || !status?.checks.every(c => c.configured)} onClick={() => act('oauth/start')}>Conectar Instagram</Button>
        <Button variant="secondary" disabled={busy || !status?.connection || status.connection.expired} onClick={() => act('subscribe')}>Habilitar notificações</Button>
        <Button variant="secondary" disabled={busy || !status?.connection || status.connection.expired} onClick={() => act('token/refresh')}>Renovar token</Button>
        <Button variant="ghost" disabled={busy || !status?.connection} onClick={() => { if (window.confirm('Desconectar o Instagram e apagar os eventos locais desta conexão?')) act('disconnect'); }}>Desconectar</Button>
      </Actions>
      <p>Renove o token antes de vencer, com intervalo mínimo de 24 horas. A desconexão remove o acesso e os eventos locais; para revogar também na Meta, remova o aplicativo nas configurações do Instagram.</p>
    </Panel>
    {status && <>
      <Panel><h2>Endereços para o painel da Meta</h2><dl>{Object.entries(status.urls).map(([key, url]) => <div key={key}><dt>{labels[key] || key}</dt><dd><code>{url}</code></dd></div>)}</dl>
        <div><Button variant="secondary" disabled={busy} onClick={() => verifyToken ? setVerifyToken('') : act('webhook/verify-token')}>{verifyToken ? 'Ocultar token de verificação' : 'Mostrar token de verificação'}</Button>{verifyToken && <p><code>{verifyToken}</code></p>}</div>
        <p>Copie o token de verificação no campo Verify Token da Meta. Ele é diferente do token de acesso e do App Secret.</p>
      </Panel>
      <Panel><h2>Configuração do servidor</h2><ul>{status.checks.map(c => <li key={c.name}>{c.configured ? '✓' : 'Pendente:'} {c.name}</li>)}</ul><p>Permissões solicitadas: {status.scopes.join(', ')}.</p></Panel>
      <Panel><h2>Eventos recebidos</h2><p>{status.events.total} evento(s) armazenado(s). Retenção: {status.retentionDays} dias.</p><p>Última recepção: {status.events.lastReceivedAt ? new Date(status.events.lastReceivedAt).toLocaleString('pt-BR') : 'Nenhuma'}.</p><Button variant="secondary" disabled={busy} onClick={() => load().catch(error => setMessage(error.message))}>Atualizar situação</Button><p>Esta primeira etapa recebe e armazena notificações. A caixa de atendimento, a criação de leads e as respostas pelo Direct serão conectadas ao fluxo do ERP em seguida.</p></Panel>
    </>}
    <p><Link href="/privacidade">Privacidade</Link> · <Link href="/exclusao-de-dados">Exclusão de dados</Link></p>
  </Page>;
}
