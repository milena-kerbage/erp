import Link from 'next/link';
import { deletionStatus } from '@/lib/meta/deletion';
import { LegalContact, LegalDocument } from '@/features/legal/LegalDocument';

export const metadata = { title: 'Acompanhar solicitação de exclusão' };

export default async function DeletionTrackingPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  let result: Awaited<ReturnType<typeof deletionStatus>> = null;
  let unavailable = false;
  try { result = await deletionStatus(typeof code === 'string' ? code : ''); }
  catch { unavailable = true; }
  const labels = { pending_review: 'Recebida e aguardando revisão', completed: 'Exclusão registrada como concluída', no_matching_data: 'Revisão concluída sem dados associados' };
  const date = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return <LegalDocument title="Acompanhar exclusão de dados" summary="Consulte o andamento do protocolo recebido pelo aplicativo Meta. Esta página apresenta apenas a situação da solicitação, sem expor informações do titular." sections={[
    { id: 'situacao', title: 'Situação da solicitação', content: result ? <>
      <p><strong>{labels[result.status]}</strong></p>
      <p>{result.message}</p>
      <p>Protocolo: <code style={{ overflowWrap: 'anywhere' }}>{result.confirmation_code}</code></p>
      <p>Recebido em <time dateTime={result.receivedAt}>{date(result.receivedAt)}</time>.</p>
      {result.completedAt && <p>Revisão registrada em <time dateTime={result.completedAt}>{date(result.completedAt)}</time>.</p>}
      <p>Guarde o link em local privado. Pessoas que possuam este protocolo podem consultar seu andamento.</p>
    </> : <><p>{unavailable ? 'A consulta está temporariamente indisponível. Tente novamente ou contate o canal de privacidade.' : 'Protocolo não encontrado. Abra o link de acompanhamento completo fornecido na solicitação.'}</p><p>Não envie senhas ou tokens para obter atendimento.</p></> },
    { id: 'atendimento', title: 'Contato e limites da solicitação', content: <>
      <p>Para esclarecer o andamento ou exercer seus direitos por outro canal, contate <LegalContact privacy />.</p>
      <p>O identificador do aplicativo Meta e o número de WhatsApp são distintos. A equipe precisa confirmar quais dados estão associados ao pedido antes de informar sua conclusão. A exclusão no sistema do Ateliê não elimina automaticamente dados sob controle de outros serviços ou cópias nos dispositivos de interlocutores.</p>
      <p>Consulte as <Link href="/exclusao-de-dados">instruções para exclusão de dados</Link> e a <Link href="/privacidade">política de privacidade</Link>.</p>
    </> },
  ]} />;
}
