import Link from 'next/link';
import { deletionStatus } from '@/lib/instagram/store';
import { LegalContact, LegalDocument } from '@/features/legal/LegalDocument';
export const metadata = { title: 'Exclusão de dados do Instagram' };
export const dynamic = 'force-dynamic';
export default async function InstagramDeletionStatus({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  let result: Awaited<ReturnType<typeof deletionStatus>> = null;
  let unavailable = false;
  try { result = await deletionStatus(typeof code === 'string' ? code : ''); } catch { unavailable = true; }
  const labels: Record<string, string> = { pending_review: 'Exclusão local executada; revisão do pedido em andamento', completed: 'Revisão concluída e exclusão registrada', no_matching_data: 'Revisão concluída sem outros dados associados' };
  return <LegalDocument title="Exclusão de dados do Instagram" summary="Acompanhe o pedido recebido da Meta usando seu protocolo privado." sections={[
    { id: 'situacao', title: 'Situação do pedido', content: result ? <><p><strong>{labels[result.status] || result.status}</strong></p><p>Protocolo: <code style={{ overflowWrap: 'anywhere' }}>{result.confirmation_code}</code></p><p>Os dados locais identificados na integração foram removidos em {new Date(result.localDeletedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p><p>A revisão verifica vínculos com outros registros do Ateliê. O protocolo não expõe dados de perfil nem mensagens.</p></> : <p>{unavailable ? 'Consulta temporariamente indisponível. Tente novamente.' : 'Protocolo não encontrado. Use o link completo recebido ao solicitar a exclusão.'}</p> },
    { id: 'contato', title: 'Informações e contato', content: <><p>Guarde este endereço em local privado. A exclusão local não remove as cópias mantidas pela Meta ou por destinatários.</p><p>Para esclarecer o pedido ou pedir a exclusão de dados de atendimento, contate <LegalContact privacy />.</p><p><Link href="/exclusao-de-dados">Instruções de exclusão</Link> · <Link href="/privacidade">Política de privacidade</Link></p></> },
  ]} />;
}
