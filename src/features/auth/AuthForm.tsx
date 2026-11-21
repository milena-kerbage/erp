'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { keyframes, useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { authRequest } from '@/lib/auth/client';

// Duas colunas no desktop: o acesso à esquerda e, à direita, uma foto do ateliê com a frase da marca.
// No celular e no tablet fica só o acesso, centralizado.
const entra = keyframes`from { opacity: 0; transform: translateY(10px); }`;
const Root = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  min-height: 100vh;
  min-height: 100dvh;
  background: ${({theme})=>theme.colors.background.surface};
  @media (max-width: 960px) { grid-template-columns: minmax(0, 1fr); }
`;
const Painel = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  @media (max-width: 960px) {
    padding: max(1.5rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
  }
`;
const Centro = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 23.5rem;
  margin: 0 auto;
  padding: 2.5rem 0;
  > * { animation: ${entra} 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
  > *:nth-child(2) { animation-delay: 0.07s; }
  > *:nth-child(3) { animation-delay: 0.14s; }
  @media (prefers-reduced-motion: reduce) { > * { animation: none; } }
`;
const Intro = styled.div`
  margin-bottom: 2rem;
  h1 { font-size: 1.625rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; color: ${({theme})=>theme.colors.text.primary}; }
  p { margin-top: .5rem; font-size: .9375rem; line-height: 1.5; color: ${({theme})=>theme.colors.text.secondary}; }
`;
const Card = styled.section`
  min-width: 0;
  width: 100%;
  form { display: flex; flex-direction: column; gap: 1.125rem; }
  form > button[type=submit] { width: 100%; min-height: 2.875rem; margin-top: .375rem; font-size: .9375rem; }
  input { font-size: max(1rem,16px); }
  a { align-self: flex-start; font-size: .8125rem; color: ${({theme})=>theme.colors.text.secondary}; text-decoration: none; transition: color .15s ease; }
  a:hover, a:focus-visible { color: ${({theme})=>theme.colors.text.primary}; text-decoration: underline; text-underline-offset: 3px; }
  a[data-esqueci] { align-self: flex-end; margin-top: -.5rem; }
`;
const Message = styled.div`
  padding: .75rem 1rem;
  border: 1px solid ${({theme})=>theme.colors.border.default};
  border-radius: ${({theme})=>theme.radii.md};
  font-size: .875rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  animation: ${entra} 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  &[role=alert] { border-color: color-mix(in srgb, ${({theme})=>theme.colors.danger} 35%, transparent); background: color-mix(in srgb, ${({theme})=>theme.colors.danger} 7%, transparent); color: ${({theme})=>theme.colors.danger}; }
`;
const Foot = styled.div`
  display: flex; gap: .5rem; align-items: center; justify-content: center;
  font-size: .75rem; color: ${({theme})=>theme.colors.text.muted};
`;
const Vitrine = styled.figure`
  position: relative;
  margin: .75rem;
  border-radius: 1.25rem;
  overflow: hidden;
  background: ${({theme})=>theme.palette.neutral[100]};
  @media (max-width: 960px) { display: none; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: foto 1.4s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
  @keyframes foto { from { opacity: 0; transform: scale(1.04); } }
  &::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgb(20 22 18 / 0.62) 0%, rgb(20 22 18 / 0.18) 38%, transparent 62%); }
  figcaption {
    position: absolute; z-index: 1; left: 0; right: 0; bottom: 0;
    padding: clamp(1.5rem, 3.5vw, 2.75rem);
    color: #fff;
    animation: ${entra} 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.25s backwards;
  }
  figcaption strong { display: block; font-family: ${({theme})=>theme.fonts.display}; font-weight: 400; font-size: clamp(2.5rem, 4.2vw, 3.75rem); line-height: 1.02; }
  figcaption span { display: block; max-width: 24rem; margin-top: .875rem; font-size: .9375rem; line-height: 1.5; color: rgb(255 255 255 / 0.86); }
  @media (prefers-reduced-motion: reduce) { img, figcaption { animation: none; } }
`;

export function AuthForm({mode = 'login'}: {mode?: 'login' | 'forgot' | 'reset' | 'invite'}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const theme = useTheme();
  useEffect(() => {
    if (mode === 'reset' || mode === 'invite') { const value=window.location.hash.slice(1);setToken(value);if(mode==='invite' && !/^[a-f0-9]{64}$/.test(value)) setError('Use o link de convite recebido da administração. Se expirou, solicite um novo link.');window.history.replaceState(null, '', mode === 'invite' ? '/convite' : '/redefinir-senha'); }
    const clear = () => {setPassword(''); setConfirm(''); setShow(false);};
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, [mode]);
  const local = email.split('@')[0];
  const suggestions = local ? ['gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com'].map(domain => `${local}@${domain}`) : [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(''); setMessage('');
    if ((mode === 'reset' || mode === 'invite') && password !== confirm) {setError('As senhas não são iguais.'); return;}
    setPending(true);
    try {
      const result = await authRequest(mode === 'login' ? 'login' : mode === 'forgot' ? 'forgot' : mode === 'invite' ? 'accept-invitation' : 'reset', {email, password, token});
      if (mode === 'login') window.location.replace('/');
      else setMessage(mode === 'invite' ? 'Convite aceito. Entre com o e-mail cadastrado pela administração e sua nova senha.' : mode === 'reset' ? 'Senha redefinida. Entre com sua nova senha.' : result.message);
    } catch (failure) {setError(failure instanceof Error ? failure.message : 'Não foi possível conectar. Tente novamente.');}
    finally {setPassword(''); setConfirm(''); setShow(false); setPending(false);}
  }
  const title = mode === 'login' ? 'Entre na sua conta' : mode === 'forgot' ? 'Recuperar senha' : mode === 'invite' ? 'Ativar sua conta' : 'Criar nova senha';
  const criandoSenha = mode === 'reset' || mode === 'invite';
  return <Root>
    <Painel>
      <Logo size={34} tone={theme.mode === "dark" ? "white" : "green"} href="/login" />
      <Centro>
        <Intro>
          <h1>{title}</h1>
          <p>{mode === 'login' ? 'Acesse o sistema do Ateliê Milena Kerbage.' : mode === 'forgot' ? 'Informe seu e-mail para receber as instruções.' : 'Escolha uma senha com letras, números e símbolos.'}</p>
        </Intro>
        <Card aria-label={title}>
          <form onSubmit={submit} autoComplete="off">
            {!criandoSenha && <><TextField label="E-mail" icon={EnvelopeSimpleIcon} type="email" name="email" autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="email" required maxLength={254} list="email-domains" placeholder="seunome@exemplo.com" autoFocus value={email} onChange={event=>setEmail(event.target.value)} /><datalist id="email-domains">{suggestions.map(value=><option key={value} value={value}/>)}</datalist></>}
            {mode !== 'forgot' && <TextField label={criandoSenha ? 'Nova senha' : 'Senha'} icon={LockSimpleIcon} type={show ? 'text' : 'password'} name="password" autoComplete="off" required minLength={8} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} hint={criandoSenha ? 'Pelo menos 8 caracteres, com letras, números e símbolos.' : undefined} trailing={<IconButton type="button" icon={show ? EyeSlashIcon : EyeIcon} label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show} tooltip={false} onClick={()=>setShow(!show)} />} />}
            {criandoSenha && <TextField label="Confirmar nova senha" type={show ? 'text' : 'password'} autoComplete="off" required minLength={8} maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)} />}
            {mode === 'login' && <Link href="/recuperar-senha" data-esqueci="">Esqueci minha senha</Link>}
            {error && <Message role="alert">{error}</Message>}
            {message && <Message role="status">{message}</Message>}
            {!message && <Button type="submit" loading={pending} disabled={pending || (criandoSenha && !token)}>{mode === 'login' ? 'Entrar' : mode === 'forgot' ? 'Enviar instruções' : 'Salvar nova senha'}</Button>}
            {mode !== 'login' && <Link href="/login">← Voltar para o login</Link>}
          </form>
        </Card>
      </Centro>
      <Foot><ShieldCheckIcon size={16} aria-hidden />Acesso exclusivo da equipe</Foot>
    </Painel>
    <Vitrine aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/login-atelie.webp" alt="" decoding="async" />
      <figcaption><strong>Cada detalhe,<br />bem cuidado.</strong><span>O seu ateliê em um só lugar: os atendimentos, os pedidos e cada oportunidade.</span></figcaption>
    </Vitrine>
  </Root>;
}
