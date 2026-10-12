'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import styled from '@emotion/styled';
import { EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { authRequest } from '@/lib/auth/client';

const Root = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 36rem;
  margin: auto;
  padding: clamp(2rem, 5vw, 4rem) 1.5rem;
  @media (max-width: 900px) {
    padding: max(2rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
  }
`;
const Intro = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  > a { margin-bottom: 1.5rem; }
  h1 { font-family: ${({theme})=>theme.fonts.display}; font-size: clamp(2.25rem, 5vw, 3rem); line-height: 1.1; color: ${({theme})=>theme.colors.primary.strong}; }
  p { max-width: 25rem; color: ${({theme})=>theme.colors.text.secondary}; }
`;
const Card = styled.section`
  min-width: 0;
  width: 100%;
  text-align: left;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  background: ${({theme})=>theme.colors.background.surface};
  border: 1px solid ${({theme})=>theme.colors.border.subtle};
  border-radius: ${({theme})=>theme.radii['2xl']};
  box-shadow: ${({theme})=>theme.shadows.sm};
  h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: .75rem; }
  p {font-size: .875rem; color: ${({theme})=>theme.colors.text.secondary}; margin-bottom: 2rem;}
  form { display: flex; flex-direction: column; gap: 1.5rem; }
  form > button[type=submit] { width:100%; min-height: 2.75rem; }
  input { font-size: max(1rem,16px); }
  a { text-decoration: underline; text-underline-offset: 3px; }
`;
const Message = styled.div`
  padding: .75rem 1rem;
  border: 1px solid ${({theme})=>theme.colors.border.default};
  border-radius: ${({theme})=>theme.radii.md};
  font-size: .875rem;
  overflow-wrap: anywhere;
  &[role=alert] {color: ${({theme})=>theme.colors.danger};}
`;
const Foot = styled.div`
  display: flex; gap: .5rem; align-items: center; justify-content: center;
  margin-top: 1.5rem; font-size: .75rem; color: ${({theme})=>theme.colors.text.muted};
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
  return <Root>
    <Intro><Logo variant="symbol" size={64} href="/login" /><h1>Cada detalhe,<br />bem cuidado.</h1><p>O seu ateliê em um só lugar. Organize os atendimentos e acompanhe cada oportunidade.</p></Intro>
    <Card aria-label={title}>
      <h2>{title}</h2>
      <p>{mode === 'login' ? 'Acesse o sistema do Ateliê Milena Kerbage.' : mode === 'forgot' ? 'Informe seu e-mail para receber as instruções.' : 'Escolha uma senha com letras, números e símbolos.'}</p>
      <form onSubmit={submit} autoComplete="off">
        {mode !== 'reset' && mode !== 'invite' && <><TextField label="E-mail" icon={EnvelopeSimpleIcon} type="email" name="email" autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="email" required maxLength={254} list="email-domains" placeholder="seunome@exemplo.com" value={email} onChange={event=>setEmail(event.target.value)} /><datalist id="email-domains">{suggestions.map(value=><option key={value} value={value}/>)}</datalist></>}
        {mode !== 'forgot' && <TextField label={mode === 'reset' || mode === 'invite' ? 'Nova senha' : 'Senha'} icon={LockSimpleIcon} type={show ? 'text' : 'password'} name="password" autoComplete="off" required minLength={8} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} hint="Pelo menos 8 caracteres, com letras, números e símbolos." trailing={<IconButton type="button" icon={show ? EyeSlashIcon : EyeIcon} label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show} tooltip={false} onClick={()=>setShow(!show)} />} />}
        {(mode === 'reset' || mode === 'invite') && <TextField label="Confirmar nova senha" type={show ? 'text' : 'password'} autoComplete="off" required minLength={8} maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)} />}
        {error && <Message role="alert">{error}</Message>}
        {message && <Message role="status">{message}</Message>}
        {mode === 'login' && <Link href="/recuperar-senha">Eu esqueci a minha senha</Link>}
        {!message && <Button type="submit" loading={pending} disabled={pending || ((mode === 'reset' || mode === 'invite') && !token)}>{mode === 'login' ? 'Entrar' : mode === 'forgot' ? 'Enviar instruções' : 'Salvar nova senha'}</Button>}
        {mode !== 'login' && <Link href="/login">Voltar para o login</Link>}
      </form>
      <Foot><ShieldCheckIcon size={16} aria-hidden />Acesso exclusivo da equipe</Foot>
    </Card>
  </Root>;
}
