'use client';
import { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { CheckCircleIcon, CopyIcon, EyeIcon, InstagramLogoIcon, LinkBreakIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { TextField } from '@/components/ui/TextField';
import { FieldGrid, Page, PageHeader, Pill } from '@/features/settings/components/ui';
import { Actions, Note, Notice, Stack } from '@/features/whatsapp/components/shared';

// Instagram do Ateliê (Instagram API com login do Instagram). Mesmo desenho da conexão do WhatsApp: app cadastrado uma
// vez na tela (cifrado no servidor, src/lib/instagram/ajustes.ts), depois só "Conectar" e "Habilitar notificações".

type Status = {
  urls: Record<string, string>; checks: { name: string; configured: boolean }[]; scopes: string[]; retentionDays: number;
  app: { appId: string; appSecretSalvo: boolean; webhookSecretPronto: boolean; versao: string };
  connection: { username: string; expiresAt: string; expired: boolean; scopes: string[]; subscribedFields: string[] } | null;
  events: { total: number; lastReceivedAt: string | null };
};
type Erro = { texto: string; campo?: string };

async function api<T>(path: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(`/api/instagram/${path}`, { method: corpo === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin', headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw Object.assign(new Error(dados.error || 'Não foi possível concluir a operação.'), { campo: dados.field as string | undefined });
  return dados as T;
}
const erroDe = (falha: unknown): Erro => ({ texto: falha instanceof Error ? falha.message : 'Operação indisponível.', campo: (falha as { campo?: string })?.campo });
const data = (valor: string | null) => (valor ? new Date(valor).toLocaleString('pt-BR') : 'nenhuma');
const semPreenchimento = { autoComplete: 'off', spellCheck: false, 'data-1p-ignore': true, 'data-lpignore': 'true', 'data-form-type': 'other' } as const;
const mascarado = { WebkitTextSecurity: 'disc' } as React.CSSProperties;

export function InstagramSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro?: boolean } | null>(null);
  const carregar = useCallback(async () => { try { setStatus(await api<Status>('status')); } catch (falha) { setAviso({ texto: erroDe(falha).texto, erro: true }); } }, []);
  useEffect(() => {
    void carregar();
    const resultado = new URLSearchParams(window.location.search).get('instagram');
    if (resultado) {
      setAviso(resultado === 'connected' ? { texto: 'Instagram conectado. Agora clique em “Habilitar notificações” para receber mensagens e comentários.' } : resultado === 'denied' ? { texto: 'A autorização foi cancelada no Instagram.', erro: true } : { texto: 'O login no Instagram não foi concluído. Confira se a URL de redirecionamento na Meta é exatamente a mostrada abaixo e tente de novo.', erro: true });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [carregar]);

  return <Page>
    <PageHeader title="Instagram" description="Conecte o perfil do Ateliê e receba mensagens e comentários no ERP." actions={<Button variant="secondary" href="/configuracoes/integracoes">Todas as integrações</Button>} />
    {aviso && <Notice $error={aviso.erro} role="status">{aviso.texto}</Notice>}
    {status ? <Stack>
      <CartaoConta status={status} aoMudar={carregar} aoAvisar={setAviso} />
      <CartaoApp status={status} aoSalvar={async () => { await carregar(); setAviso({ texto: 'App do Instagram salvo.' }); }} />
      <CartaoMeta status={status} />
    </Stack> : <Note>Consultando o Instagram…</Note>}
  </Page>;
}

function CartaoConta({ status, aoMudar, aoAvisar }: { status: Status; aoMudar: () => Promise<void>; aoAvisar: (a: { texto: string; erro?: boolean }) => void }) {
  const [ocupado, setOcupado] = useState('');
  const [sair, setSair] = useState(false);
  const conta = status.connection;
  const podeConectar = Boolean(status.app.appId) && status.app.appSecretSalvo && status.checks.find((c) => c.name.startsWith('Chave'))?.configured !== false;
  const agir = async (acao: string, mensagem: string) => {
    setOcupado(acao);
    try {
      const resposta = await api<{ authorizationUrl?: string }>(acao, {});
      if (resposta.authorizationUrl) { window.location.assign(resposta.authorizationUrl); return; }
      await aoMudar(); aoAvisar({ texto: mensagem }); setSair(false);
    } catch (falha) { aoAvisar({ texto: erroDe(falha).texto, erro: true }); }
    finally { setOcupado(''); }
  };
  return <Painel>
    <Cabeca><Titulo><InstagramLogoIcon size={20} aria-hidden /> Perfil do Instagram</Titulo><Pill $tone={conta && !conta.expired ? 'green' : 'peach'}>{conta ? (conta.expired ? 'Acesso vencido' : 'Conectado') : 'Não conectado'}</Pill></Cabeca>
    {conta ? <Stack>
      <Perfil><CheckCircleIcon size={28} weight="fill" aria-hidden /><div><strong>@{conta.username}</strong><span>Acesso válido até {data(conta.expiresAt)} · Notificações: {conta.subscribedFields.length ? 'ligadas' : 'desligadas'}</span></div></Perfil>
      <Note>Última notificação recebida: {data(status.events.lastReceivedAt)} · {status.events.total} evento(s) guardado(s) por {status.retentionDays} dias.</Note>
      <Actions>
        <Button size="sm" loading={ocupado === 'subscribe'} disabled={conta.expired} onClick={() => void agir('subscribe', 'Notificações habilitadas: mensagens e comentários passam a chegar ao ERP.')}>Habilitar notificações</Button>
        <Button size="sm" variant="secondary" loading={ocupado === 'token/refresh'} disabled={conta.expired} onClick={() => void agir('token/refresh', 'Acesso renovado por mais 60 dias.')}>Renovar acesso</Button>
        <Button size="sm" variant="ghost" loading={ocupado === 'oauth/start'} onClick={() => void agir('oauth/start', '')}>Conectar de novo</Button>
        {sair ? <><Button size="sm" variant="danger" icon={LinkBreakIcon} loading={ocupado === 'disconnect'} onClick={() => void agir('disconnect', 'Instagram desconectado.')}>Confirmar desconexão</Button><Button size="sm" variant="ghost" onClick={() => setSair(false)}>Cancelar</Button></>
          : <Button size="sm" variant="ghost" icon={LinkBreakIcon} onClick={() => setSair(true)}>Desconectar</Button>}
      </Actions>
    </Stack> : <Stack>
      <Passos>
        <li>Cadastre o app do Instagram logo abaixo (uma vez só) e confira os endereços na Meta.</li>
        <li>Clique em <strong>Conectar Instagram</strong> e entre com o perfil <strong>@milenakerbageatelie</strong>.</li>
        <li>De volta aqui, clique em <strong>Habilitar notificações</strong>.</li>
      </Passos>
      <Actions><Button icon={InstagramLogoIcon} loading={ocupado === 'oauth/start'} disabled={!podeConectar} onClick={() => void agir('oauth/start', '')}>Conectar Instagram</Button>{!podeConectar && <Note>Falta cadastrar o App ID e o App Secret do Instagram.</Note>}</Actions>
    </Stack>}
  </Painel>;
}

const RECURSOS = [
  { id: 'instagram_business_manage_messages', rotulo: 'Mensagens do Direct', texto: 'Receber e responder mensagens.' },
  { id: 'instagram_business_manage_comments', rotulo: 'Comentários', texto: 'Receber comentários dos posts.' },
];

function CartaoApp({ status, aoSalvar }: { status: Status; aoSalvar: () => Promise<void> }) {
  const pronto = Boolean(status.app.appId) && status.app.appSecretSalvo;
  const [aberto, setAberto] = useState(!pronto);
  const [campos, setCampos] = useState({ appId: status.app.appId, appSecret: '', webhookSecret: '' });
  const [recursos, setRecursos] = useState(RECURSOS.map((r) => r.id).filter((id) => status.scopes.includes(id)));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  const alterar = (campo: keyof typeof campos) => (evento: React.ChangeEvent<HTMLInputElement>) => setCampos((atual) => ({ ...atual, [campo]: evento.target.value }));
  const salvar = async () => {
    setSalvando(true); setErro(null);
    try { await api('ajustes', { ...campos, appId: campos.appId.trim(), recursos }); setCampos((atual) => ({ ...atual, appSecret: '', webhookSecret: '' })); await aoSalvar(); setAberto(false); }
    catch (falha) { setErro(erroDe(falha)); }
    finally { setSalvando(false); }
  };
  const erroCampo = (campo: string) => (erro?.campo === campo ? erro.texto : undefined);
  return <Painel>
    <Cabeca><Titulo>App do Instagram <small>(uma vez só)</small></Titulo><Pill $tone={pronto ? 'green' : 'peach'}>{pronto ? 'Pronto' : 'Falta cadastrar'}</Pill></Cabeca>
    {!aberto ? <Actions><Note>App {status.app.appId} · Graph {status.app.versao} · {status.scopes.length > 1 ? 'mensagens e comentários' : 'só o perfil'}</Note><Button size="sm" variant="ghost" onClick={() => setAberto(true)}>Ver ou alterar</Button></Actions>
      : <form onSubmit={(evento) => { evento.preventDefault(); void salvar(); }} autoComplete="off"><Stack>
        <Note>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">Meta for Developers</a>, abra o app e vá em <strong>Instagram &gt; Configuração da API com login do Instagram</strong>. O <strong>App ID e o App Secret do Instagram</strong> ficam em “Configurações do login da empresa” (são diferentes do App ID do app). O <strong>App Secret do app</strong> fica em Configurações do app &gt; Básico; se for o mesmo app do WhatsApp, deixe vazio.</Note>
        <FieldGrid>
          <TextField label="App ID do Instagram" name="ig-app-id" inputMode="numeric" value={campos.appId} onChange={alterar('appId')} error={erroCampo('appId')} {...semPreenchimento} />
          <TextField label="App Secret do Instagram" name="ig-app-chave" value={campos.appSecret} onChange={alterar('appSecret')} placeholder={status.app.appSecretSalvo ? 'Guardado. Deixe vazio para manter' : '32 letras e números'} error={erroCampo('appSecret')} style={mascarado} {...semPreenchimento} />
          <TextField label="App Secret do app (webhooks)" name="ig-app-webhook" value={campos.webhookSecret} onChange={alterar('webhookSecret')} placeholder={status.app.webhookSecretPronto ? 'Pronto. Deixe vazio para manter' : 'Vazio = o do WhatsApp'} hint="Opcional se o app for o mesmo do WhatsApp." error={erroCampo('webhookSecret')} style={mascarado} {...semPreenchimento} />
        </FieldGrid>
        <Recursos>{RECURSOS.map((r) => <label key={r.id}><input type="checkbox" checked={recursos.includes(r.id)} onChange={(e) => setRecursos((atual) => e.target.checked ? [...atual, r.id] : atual.filter((id) => id !== r.id))} /><span><strong>{r.rotulo}</strong><small>{r.texto} A permissão precisa estar adicionada no app da Meta.</small></span></label>)}</Recursos>
        <Actions><Button type="submit" loading={salvando}>Salvar</Button>{pronto && <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>}</Actions>
        {erro && !['appId', 'appSecret', 'webhookSecret'].includes(erro.campo ?? '') && <Notice $error role="alert">{erro.texto}</Notice>}
      </Stack></form>}
  </Painel>;
}

function CartaoMeta({ status }: { status: Status }) {
  const [token, setToken] = useState('');
  const [erro, setErro] = useState('');
  const mostrar = async () => { try { setToken((await api<{ verifyToken: string }>('webhook/verify-token', {})).verifyToken); } catch (falha) { setErro(erroDe(falha).texto); } };
  const { urls } = status;
  const linhas = [
    { rotulo: 'URL de redirecionamento do login do Instagram', valor: urls.redirect, onde: 'Configurações do login da empresa > URIs de redirecionamento OAuth' },
    { rotulo: 'URL de desautorização', valor: urls.deauthorize, onde: 'Configurações do login da empresa > Desautorizar' },
    { rotulo: 'URL de exclusão de dados', valor: urls.dataDeletion, onde: 'Configurações do login da empresa > Solicitações de exclusão de dados' },
    { rotulo: 'URL do webhook', valor: urls.webhook, onde: 'Instagram > Webhooks > URL de callback' },
    { rotulo: 'Token de verificação do webhook', valor: token, segredo: true, onde: 'Instagram > Webhooks > Verificar token' },
    { rotulo: 'Política de privacidade', valor: urls.privacy, onde: 'Configurações do app > Básico' },
    { rotulo: 'Termos de uso', valor: urls.terms, onde: 'Configurações do app > Básico' },
    { rotulo: 'Instruções de exclusão de dados', valor: urls.deletionInstructions, onde: 'Configurações do app > Básico' },
  ];
  return <Painel>
    <Cabeca><Titulo>O que fica cadastrado no app da Meta</Titulo></Cabeca>
    <Note>Copie cada valor no campo indicado. Eles não mudam quando o perfil é reconectado. Campos do webhook a assinar: <code>messages</code>, <code>comments</code>, <code>messaging_postbacks</code>, <code>messaging_seen</code>, <code>message_reactions</code>.</Note>
    <Tabela>{linhas.map((linha) => <li key={linha.rotulo}>
      <div><strong>{linha.rotulo}</strong><small>{linha.onde}</small></div>
      {linha.segredo && !linha.valor ? <Button size="sm" variant="secondary" icon={EyeIcon} onClick={() => void mostrar()}>Mostrar token</Button> : <code>{linha.valor}</code>}
      {linha.valor ? <CopyButton text={linha.valor} label={`Copiar ${linha.rotulo.toLowerCase()}`} icon={CopyIcon} size="sm" variant="ghost" /> : <span />}
    </li>)}</Tabela>
    {erro && <Notice $error role="alert">{erro}</Notice>}
  </Painel>;
}

const Painel = styled.section`
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[0]}; min-width: 0;
  code { font-size: 0.75rem; overflow-wrap: anywhere; }
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; }
`;
const Cabeca = styled.div`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)};`;
const Titulo = styled.h3`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.fontSizes.lg}; font-weight: ${({ theme }) => theme.fontWeights.semibold};
  small { font-size: 0.8125rem; font-weight: 400; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Perfil = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(3)};
  svg { color: ${({ theme }) => theme.colors.primary.main}; flex-shrink: 0; }
  strong { display: block; font-size: 1.125rem; }
  span { font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Passos = styled.ol`
  margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)};
  font-size: 0.8125rem; line-height: 1.6; color: ${({ theme }) => theme.colors.text.secondary};
`;
const Recursos = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: ${({ theme }) => theme.spacing(2)};
  label { display: flex; gap: ${({ theme }) => theme.spacing(2)}; align-items: flex-start; padding: ${({ theme }) => theme.spacing(3)}; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; cursor: pointer; }
  input { margin-top: 3px; accent-color: ${({ theme }) => theme.colors.primary.main}; }
  strong { display: block; font-size: 0.875rem; }
  small { display: block; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Tabela = styled.ul`
  margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column;
  li { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr) auto; align-items: center; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(2, 0)}; border-top: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  li > div strong { display: block; font-size: 0.8125rem; }
  li > div small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; }
  ${({ theme }) => theme.media.md} { li { grid-template-columns: minmax(0, 1fr) auto; } li > div { grid-column: 1 / -1; } }
`;
