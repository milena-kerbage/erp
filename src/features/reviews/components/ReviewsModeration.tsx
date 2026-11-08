"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ChatCircleTextIcon, CheckIcon, ProhibitIcon, StarIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { useCurrentUser } from "@/features/settings/store";
import { ErpRequestError, erpRequest, requestError } from "@/features/operations/client";
import { Actions, Card, Empty, Label, NativeSelect, Notice, Page, PageHeader, Pill, Stack, Toolbar } from "@/features/operations/components/ui";
import { LIMITES_AVALIACAO, PARA_QUEM, STATUS_AVALIACAO, type StatusAvaliacao } from "@/loja/lib/avaliacoes/regras";

type Photo = { id: string; largura: number; altura: number };
type Review = {
  id: string; produto: string; produtoNome: string; nota: number; titulo: string; texto: string; nome: string; cidade: string; paraQuem: keyof typeof PARA_QUEM | "";
  criadaEm: string; fotos: Photo[]; resposta: { texto: string; em: string } | null; status: StatusAvaliacao; motivoRecusa: string; revisao: number; moderadaEm: string | null; moderadaPor: string;
};
type ListResponse = { avaliacoes: Review[]; contagem: Record<StatusAvaliacao, number>; produtos: { slug: string; nome: string; total: number }[]; pagination: { total: number; hasMore: boolean } };
type Filter = StatusAvaliacao | "todas";
type Action = { kind: "reject" | "reply" | "delete"; review: Review } | null;

const PAGE = 20;
const tones: Record<StatusAvaliacao, "peach" | "green" | "rose"> = { pendente: "peach", aprovada: "green", recusada: "rose" };
const photoUrl = (id: string, size: "mini" | "grande") => `/api/erp/avaliacoes/foto/${encodeURIComponent(id)}?tamanho=${size}`;
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" }).format(new Date(value));

/**
 * Moderação das avaliações enviadas na página de produto da loja. A loja não tem conta de cliente nem
 * compra no site, então nada é "compra verificada": tudo entra pendente e só aparece na loja depois de
 * aprovado aqui. A resposta do ateliê aparece abaixo da avaliação publicada; o motivo da recusa é
 * interno. Excluir apaga a avaliação e as fotos (pedido de exclusão da cliente, LGPD, ou spam).
 */
export function ReviewsModeration() {
  const currentUser = useCurrentUser();
  const [status, setStatus] = useState<Filter>("pendente");
  const [product, setProduct] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [text, setText] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const query = useCallback((offset: number) => `avaliacoes?status=${status}&limit=${PAGE}&offset=${offset}${product ? `&produto=${encodeURIComponent(product)}` : ""}`, [status, product]);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(""); setDenied(false);
    try { setData(await erpRequest<ListResponse>(query(0), { signal })); }
    catch (caught) { if (!signal?.aborted) { setError(requestError(caught)); setDenied(caught instanceof ErpRequestError && caught.status === 403); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [query]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  async function loadMore() {
    if (!data) return;
    setLoading(true);
    try {
      const next = await erpRequest<ListResponse>(query(data.avaliacoes.length));
      setData({ ...next, avaliacoes: [...data.avaliacoes, ...next.avaliacoes.filter((item) => !data.avaliacoes.some((existing) => existing.id === item.id))] });
    } catch (caught) { setError(requestError(caught)); } finally { setLoading(false); }
  }

  async function moderate(review: Review, body: Record<string, unknown>, message: string) {
    setBusy(review.id); setError(""); setDialogError("");
    try {
      await erpRequest(`avaliacoes/${encodeURIComponent(review.id)}`, { method: "PATCH", body: { revisao: review.revisao, ...body } });
      setNotice(message); setAction(null); await load();
    } catch (caught) { (action ? setDialogError : setError)(requestError(caught)); }
    finally { setBusy(""); }
  }
  async function remove(review: Review) {
    setBusy(review.id); setDialogError("");
    try {
      await erpRequest(`avaliacoes/${encodeURIComponent(review.id)}?revisao=${review.revisao}`, { method: "DELETE" });
      setNotice("Avaliação e fotos excluídas definitivamente."); setAction(null); await load();
    } catch (caught) { setDialogError(requestError(caught)); }
    finally { setBusy(""); }
  }
  function open(kind: "reject" | "reply" | "delete", review: Review) {
    setDialogError(""); setText(kind === "reply" ? review.resposta?.texto ?? "" : kind === "reject" ? review.motivoRecusa : ""); setAction({ kind, review });
  }

  const counts = data?.contagem ?? { pendente: 0, aprovada: 0, recusada: 0 };
  const tabs = useMemo(() => [
    { value: "pendente" as const, label: "Pendentes", count: counts.pendente },
    { value: "aprovada" as const, label: "Aprovadas", count: counts.aprovada },
    { value: "recusada" as const, label: "Recusadas", count: counts.recusada },
    { value: "todas" as const, label: "Todas", count: counts.pendente + counts.aprovada + counts.recusada },
  ], [counts.pendente, counts.aprovada, counts.recusada]);
  const reviews = data?.avaliacoes ?? [];
  const pending = Boolean(busy);
  const restricted = currentUser?.permission === "member" || denied;

  return <Page>
    <PageHeader title="Avaliações da loja" description="Avaliações enviadas nas páginas de produto. Só as aprovadas aparecem na loja, com a resposta do ateliê logo abaixo." actions={<Button variant="secondary" icon={ArrowClockwiseIcon} loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    {restricted ? <Notice role="alert">A moderação de avaliações é feita pela administração e pela gestão do ateliê. Seu perfil não tem acesso a esta área.</Notice> : <>
      {error && <Notice role="alert">{error} <Button variant="ghost" size="sm" onClick={() => void load()}>Tentar novamente</Button></Notice>}
      {notice && <Notice role="status">{notice}</Notice>}
      <Card>
        <Toolbar>
          <Label>Produto<NativeSelect value={product} onChange={(event) => setProduct(event.target.value)}><option value="">Todos os produtos</option>{data?.produtos.map((item) => <option key={item.slug} value={item.slug}>{item.nome} ({item.total})</option>)}</NativeSelect></Label>
        </Toolbar>
        <Tabs items={tabs} value={status} onChange={setStatus} label="Situação das avaliações">
          {loading && !data ? <Empty role="status">Carregando avaliações…</Empty> : !reviews.length ? <Empty><strong>{error ? "A lista não pôde ser carregada." : status === "pendente" ? "Nenhuma avaliação esperando moderação." : "Nenhuma avaliação neste filtro."}</strong><span>As avaliações chegam pelo botão “Escrever uma avaliação” da página de produto.</span></Empty> :
            <List>{reviews.map((review) => <Item key={review.id} aria-labelledby={`review-${review.id}`}>
              <Head>
                <div>
                  <Stars aria-label={`Nota ${review.nota} de 5`}>{[1, 2, 3, 4, 5].map((position) => <StarIcon key={position} size={16} weight={position <= review.nota ? "fill" : "regular"} aria-hidden />)}</Stars>
                  <h3 id={`review-${review.id}`}>{review.titulo}</h3>
                  <Meta>{review.produtoNome} · {dateTime(review.criadaEm)}</Meta>
                </div>
                <Pill $tone={tones[review.status]}>{STATUS_AVALIACAO[review.status]}</Pill>
              </Head>
              <Body>{review.texto}</Body>
              <Meta><strong>{review.nome}</strong>{[review.cidade, review.paraQuem && `Para: ${PARA_QUEM[review.paraQuem]}`].filter(Boolean).map((part) => ` · ${part}`)}</Meta>
              {review.fotos.length > 0 && <Photos aria-label="Fotos enviadas">{review.fotos.map((photo, index) => <li key={photo.id}><button type="button" aria-label={`Ampliar a foto ${index + 1} de ${review.fotos.length}`} onClick={() => setLightbox({ images: review.fotos.map((item, position) => ({ url: photoUrl(item.id, "grande"), name: `avaliacao-${review.id}-foto-${position + 1}.webp` })), index })}>
                {/* biome-ignore lint/performance/noImgElement: miniatura WebP autenticada servida pela API do ERP */}
                <img src={photoUrl(photo.id, "mini")} alt={`Foto ${index + 1} de ${review.nome}`} width={72} height={72} loading="lazy" />
              </button></li>)}</Photos>}
              {review.resposta && <Reply><strong>Resposta do ateliê</strong> · {dateTime(review.resposta.em)}<p>{review.resposta.texto}</p></Reply>}
              {review.status === "recusada" && review.motivoRecusa && <Meta>Motivo interno da recusa: {review.motivoRecusa}</Meta>}
              {review.moderadaEm && <Meta>Moderada por {review.moderadaPor || "equipe"} em {dateTime(review.moderadaEm)}</Meta>}
              <Actions>
                {review.status !== "aprovada" && <Button size="sm" icon={CheckIcon} disabled={pending} loading={busy === review.id && !action} onClick={() => void moderate(review, { status: "aprovada" }, "Avaliação aprovada e publicada na loja.")}>Aprovar</Button>}
                {review.status !== "recusada" && <Button size="sm" variant="secondary" icon={ProhibitIcon} disabled={pending} onClick={() => open("reject", review)}>Recusar</Button>}
                <Button size="sm" variant="secondary" icon={ChatCircleTextIcon} disabled={pending} onClick={() => open("reply", review)}>{review.resposta ? "Editar resposta" : "Responder"}</Button>
                {review.status !== "pendente" && <Button size="sm" variant="ghost" icon={ArrowCounterClockwiseIcon} disabled={pending} onClick={() => void moderate(review, { status: "pendente" }, "Avaliação voltou para pendente e saiu da loja.")}>Voltar para pendente</Button>}
                <Button size="sm" variant="ghost" icon={TrashIcon} disabled={pending} onClick={() => open("delete", review)}>Excluir</Button>
              </Actions>
            </Item>)}</List>}
        </Tabs>
        <small>{reviews.length} avaliação(ões) exibida(s){data && data.pagination.total > reviews.length ? ` de ${data.pagination.total}` : ""}.</small>
      </Card>
      {data?.pagination.hasMore && <Button variant="secondary" loading={loading} onClick={() => void loadMore()}>Carregar mais avaliações</Button>}
      <Notice>A loja recebe as avaliações sem login de cliente, com honeypot, tempo mínimo de preenchimento e limite de 3 por hora por conexão. Fotos chegam reduzidas (WebP, 1600 px) e sem localização ou dados da câmera. Confira se a foto é do produto e se não mostra dados pessoais antes de aprovar.</Notice>
    </>}

    <Dialog open={action?.kind === "reject"} onClose={() => { if (!pending) setAction(null); }} title="Recusar avaliação" description="A avaliação não aparece na loja. O motivo fica só no ERP e não é enviado à cliente." footer={<Actions><Button variant="ghost" disabled={pending} onClick={() => setAction(null)}>Cancelar</Button><Button variant="danger" loading={pending} onClick={() => { if (action) void moderate(action.review, { status: "recusada", motivo: text }, "Avaliação recusada."); }}>Recusar</Button></Actions>}>
      <Stack><TextField label="Motivo interno" multiline rows={4} maxLength={LIMITES_AVALIACAO.motivo} value={text} onChange={(event) => setText(event.target.value)} hint={`Obrigatório, de 3 a ${LIMITES_AVALIACAO.motivo} caracteres. Ex.: foto de outro produto, conteúdo ofensivo, spam.`} />{dialogError && <Notice role="alert">{dialogError}</Notice>}</Stack>
    </Dialog>
    <Dialog open={action?.kind === "reply"} onClose={() => { if (!pending) setAction(null); }} title="Resposta do ateliê" description="Aparece na loja abaixo da avaliação, como “Resposta do ateliê”, quando ela estiver aprovada. Deixe vazio para remover." footer={<Actions><Button variant="ghost" disabled={pending} onClick={() => setAction(null)}>Cancelar</Button><Button loading={pending} onClick={() => { if (action) void moderate(action.review, { resposta: text }, text.trim() ? "Resposta salva." : "Resposta removida."); }}>Salvar resposta</Button></Actions>}>
      <Stack>{action?.kind === "reply" && <Notice>“{action.review.titulo}” · {action.review.nome}</Notice>}<TextField label="Resposta" multiline rows={5} maxLength={LIMITES_AVALIACAO.resposta} value={text} onChange={(event) => setText(event.target.value)} hint={`${text.length}/${LIMITES_AVALIACAO.resposta} caracteres. Texto público: não inclua dados pessoais da cliente.`} />{dialogError && <Notice role="alert">{dialogError}</Notice>}</Stack>
    </Dialog>
    <Dialog open={action?.kind === "delete"} onClose={() => { if (!pending) setAction(null); }} title="Excluir avaliação" description="A avaliação e as fotos são apagadas definitivamente do banco e saem da loja. Use para pedidos de exclusão da cliente ou spam; para só esconder, recuse." footer={<Actions><Button variant="ghost" disabled={pending} onClick={() => setAction(null)}>Cancelar</Button><Button variant="danger" icon={TrashIcon} loading={pending} onClick={() => { if (action) void remove(action.review); }}>Excluir definitivamente</Button></Actions>}>
      <Stack>{action?.kind === "delete" && <Notice>“{action.review.titulo}” · {action.review.nome} · {action.review.fotos.length} foto(s)</Notice>}{dialogError && <Notice role="alert">{dialogError}</Notice>}</Stack>
    </Dialog>
    <Lightbox images={lightbox?.images ?? []} index={lightbox?.index ?? null} onClose={() => setLightbox(null)} />
  </Page>;
}

const List = styled.div`display: flex; flex-direction: column; margin-top: ${({ theme }) => theme.spacing(2)};`;
const Item = styled.article`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; padding: ${({ theme }) => theme.spacing(5, 0)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; min-width: 0; &:last-of-type { border-bottom: 0; } h3 { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; margin-top: ${({ theme }) => theme.spacing(1.5)}; overflow-wrap: anywhere; }`;
const Head = styled.div`display: flex; align-items: flex-start; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)}; > div { min-width: 0; }`;
const Stars = styled.span`display: inline-flex; gap: 2px; color: ${({ theme }) => theme.colors.text.primary};`;
const Meta = styled.p`font-size: 0.8125rem; line-height: 1.6; color: ${({ theme }) => theme.colors.text.muted}; overflow-wrap: anywhere; strong { color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.medium}; }`;
const Body = styled.p`font-size: 0.875rem; line-height: 1.65; color: ${({ theme }) => theme.colors.text.secondary}; white-space: pre-line; overflow-wrap: anywhere;`;
const Photos = styled.ul`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(2)}; list-style: none; button { display: block; width: 72px; height: 72px; padding: 0; border: 1px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; overflow: hidden; cursor: zoom-in; background: ${({ theme }) => theme.colors.background.surface}; } img { width: 100%; height: 100%; object-fit: cover; display: block; }`;
const Reply = styled.div`padding: ${({ theme }) => theme.spacing(3, 4)}; border-left: 3px solid ${({ theme }) => theme.colors.border.subtle}; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.background.surface}; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; strong { color: ${({ theme }) => theme.colors.text.primary}; } p { margin-top: ${({ theme }) => theme.spacing(1.5)}; color: ${({ theme }) => theme.colors.text.secondary}; white-space: pre-line; line-height: 1.6; }`;
