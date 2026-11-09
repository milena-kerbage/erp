"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import styled from "@emotion/styled";
import { CloudArrowUpIcon, MagnifyingGlassPlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Lightbox } from "@/components/ui/Lightbox";
import { TextField } from "@/components/ui/TextField";
import { Notice, NativeSelect } from "@/features/operations/components/ui";
import { formatBytes } from "@/lib/format";
import { transientOptions } from "@/lib/emotion/transient";
import type { ImagemProdutoGestao, RespostaImagensProduto, TipoImagemProduto } from "@/features/ecommerce/types";
import { conflito, enviarFoto, erpRequest, LIMITES_FOTO, loja, problemaDaFoto, requestError } from "../api";
import { Alca, Confirmar, Sub, useArrastar } from "../comum";

const TIPOS: Record<TipoImagemProduto, string> = { principal: "Principal", detalhe: "Detalhe", aplicacao: "No ambiente" };

/**
 * Fotos do produto: gravadas na hora (fora do "Salvar"). Upload múltiplo (botão ou arrastar arquivos),
 * ordem por arrastar ou setas (a 1ª é a do card), texto alternativo, tipo e cor por foto, remover.
 * Cada operação sobe a revisão do produto: a resposta traz a nova e o editor segue sem recarregar.
 */
export function FotosProduto({ produtoId, nome, imagens, revisao, podeEditar, onAtualizar }: {
  produtoId: string; nome: string; imagens: ImagemProdutoGestao[]; revisao: number; podeEditar: boolean; onAtualizar: (resposta: RespostaImagensProduto) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState(imagens);
  const [enviando, setEnviando] = useState<{ atual: number; total: number } | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [soltando, setSoltando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [remover, setRemover] = useState<ImagemProdutoGestao | null>(null);
  const [ampliar, setAmpliar] = useState<number | null>(null);
  // A revisão muda a cada foto enviada (o envio em série usa sempre a mais nova).
  const revisaoAtual = useRef(revisao);
  useEffect(() => { revisaoAtual.current = revisao; }, [revisao]);
  // A lista local acompanha o servidor (e o arrastar mexe nela antes de gravar).
  const [anteriores, setAnteriores] = useState(imagens);
  if (anteriores !== imagens) { setAnteriores(imagens); setLista(imagens); }

  const aplicar = (resposta: RespostaImagensProduto) => { revisaoAtual.current = resposta.revisao; setLista(resposta.imagens); onAtualizar(resposta); };
  const falhou = (caught: unknown) => setErros([conflito(caught) ? "O produto foi alterado em outra tela. Recarregue a página para ver as fotos atuais." : requestError(caught)]);

  async function enviar(arquivos: File[]) {
    if (!podeEditar || !arquivos.length) return;
    const vagas = LIMITES_FOTO.porProduto - lista.length;
    const problemas: string[] = [];
    const validos = arquivos.filter((arquivo) => { const problema = problemaDaFoto(arquivo); if (problema) problemas.push(problema); return !problema; });
    if (validos.length > vagas) problemas.push(`Cada produto tem até ${LIMITES_FOTO.porProduto} fotos: ${validos.length - Math.max(0, vagas)} foto(s) ficaram de fora.`);
    const fila = validos.slice(0, Math.max(0, vagas));
    setErros(problemas);
    for (const [indice, arquivo] of fila.entries()) {
      setEnviando({ atual: indice + 1, total: fila.length });
      try { aplicar(await enviarFoto(produtoId, arquivo, revisaoAtual.current, lista.length + indice === 0 ? nome : "")); }
      catch (caught) { problemas.push(`${arquivo.name}: ${conflito(caught) ? "o produto foi alterado em outra tela; recarregue a página." : requestError(caught)}`); setErros([...problemas]); if (conflito(caught)) break; }
    }
    setEnviando(null);
    if (entrada.current) entrada.current.value = "";
  }

  async function gravarOrdem(nova: ImagemProdutoGestao[]) {
    if (nova.map((foto) => foto.id).join() === imagens.map((foto) => foto.id).join()) return;
    setOcupado(true); setErros([]);
    try { aplicar(await erpRequest<RespostaImagensProduto>(loja(`produtos/${produtoId}/imagens/ordem`), { method: "PUT", body: { revisao: revisaoAtual.current, ids: nova.map((foto) => foto.id) } })); }
    catch (caught) { setLista(imagens); falhou(caught); } finally { setOcupado(false); }
  }
  async function editar(foto: ImagemProdutoGestao, campos: Partial<Pick<ImagemProdutoGestao, "alt" | "cor" | "tipo">>) {
    if (Object.entries(campos).every(([chave, valor]) => foto[chave as keyof typeof campos] === valor)) return;
    setOcupado(true); setErros([]);
    try { aplicar(await erpRequest<RespostaImagensProduto>(loja(`produtos/${produtoId}/imagens/${foto.id}`), { method: "PATCH", body: { revisao: revisaoAtual.current, ...campos } })); }
    catch (caught) { falhou(caught); } finally { setOcupado(false); }
  }
  async function confirmarRemocao() {
    if (!remover) return;
    setOcupado(true); setErros([]);
    try { aplicar(await erpRequest<RespostaImagensProduto>(loja(`produtos/${produtoId}/imagens/${remover.id}?revisao=${revisaoAtual.current}`), { method: "DELETE" })); setRemover(null); }
    catch (caught) { falhou(caught); setRemover(null); } finally { setOcupado(false); }
  }

  const { linha, alca } = useArrastar(lista, setLista, (nova) => void gravarOrdem(nova), podeEditar && !ocupado && !enviando);
  const arquivosArrastados = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return <Fotos>
    {podeEditar && <Zona $ativa={soltando} onDragOver={(event) => { if (!arquivosArrastados(event)) return; event.preventDefault(); setSoltando(true); }} onDragLeave={() => setSoltando(false)}
      onDrop={(event) => { if (!arquivosArrastados(event)) return; event.preventDefault(); setSoltando(false); void enviar(Array.from(event.dataTransfer.files)); }}>
      <CloudArrowUpIcon size={26} aria-hidden />
      <strong>{enviando ? `Enviando ${enviando.atual} de ${enviando.total}…` : "Arraste as fotos para cá"}</strong>
      <Sub>JPEG, PNG ou WebP · até {LIMITES_FOTO.porProduto} fotos ({lista.length} usada{lista.length === 1 ? "" : "s"}). Fotos grandes são reduzidas aqui antes do envio (cada uma até 3 MB); o servidor gera o WebP final (até 1600 px) sem os dados de localização.</Sub>
      <input ref={entrada} type="file" accept={LIMITES_FOTO.tipos.join(",")} multiple hidden onChange={(event) => void enviar(Array.from(event.target.files ?? []))} />
      <Button size="sm" variant="secondary" icon={CloudArrowUpIcon} loading={Boolean(enviando)} disabled={lista.length >= LIMITES_FOTO.porProduto} onClick={() => entrada.current?.click()}>
        {lista.length >= LIMITES_FOTO.porProduto ? "Limite de fotos atingido" : "Escolher fotos"}
      </Button>
    </Zona>}
    {erros.length > 0 && <Notice role="alert">{erros.map((erro) => <span key={erro} style={{ display: "block" }}>{erro}</span>)}</Notice>}
    {!lista.length ? <Sub>Sem fotos: a loja mostra a composição de cor no lugar. A 1ª foto vira a do card e da listagem.</Sub> :
      <ListaFotos aria-label="Fotos do produto, na ordem da loja" aria-busy={ocupado || undefined}>
        {lista.map((foto, posicao) => <li key={foto.id} {...linha(foto, posicao)}>
          <Alca rotulo={`Foto ${posicao + 1}`} {...alca(foto, posicao)} disabled={!podeEditar} />
          <Quadro type="button" onClick={() => setAmpliar(posicao)} aria-label={`Ampliar foto ${posicao + 1}`}>
            <img src={foto.urlMini} alt={foto.alt} loading="lazy" />
            {posicao === 0 && <Capa>Capa</Capa>}
            <MagnifyingGlassPlusIcon size={14} aria-hidden />
          </Quadro>
          <Campos>
            <TextField label="Texto alternativo" key={`alt-${foto.id}-${foto.alt}`} defaultValue={foto.alt} maxLength={200} disabled={!podeEditar || ocupado} placeholder="Ex.: kit berço rosê com bordado"
              onBlur={(event) => void editar(foto, { alt: event.target.value.trim() })} />
            <Pequenos>
              <label>Tipo<NativeSelect value={foto.tipo} disabled={!podeEditar || ocupado} onChange={(event) => void editar(foto, { tipo: event.target.value as TipoImagemProduto })}>
                {(Object.keys(TIPOS) as TipoImagemProduto[]).map((tipo) => <option key={tipo} value={tipo}>{TIPOS[tipo]}</option>)}
              </NativeSelect></label>
              <TextField label="Cor (opcional)" key={`cor-${foto.id}-${foto.cor}`} defaultValue={foto.cor} maxLength={40} disabled={!podeEditar || ocupado} placeholder="Ex.: Rosê" onBlur={(event) => void editar(foto, { cor: event.target.value.trim() })} />
            </Pequenos>
            <Sub>{foto.largura} × {foto.altura} px · {formatBytes(foto.tamanho)}</Sub>
          </Campos>
          <IconButton icon={TrashIcon} label={`Remover foto ${posicao + 1}`} variant="ghost" size="sm" tooltip="left" disabled={!podeEditar || ocupado} onClick={() => setRemover(foto)} />
        </li>)}
      </ListaFotos>}
    <Lightbox images={lista.map((foto, posicao) => ({ url: foto.url, name: foto.alt || `${nome} · foto ${posicao + 1}` }))} index={ampliar} onClose={() => setAmpliar(null)} />
    <Confirmar aberto={remover !== null} titulo="Remover esta foto?" acao="Remover foto" ocupado={ocupado} onFechar={() => setRemover(null)} onConfirmar={() => void confirmarRemocao()}
      descricao="A foto sai do produto e da loja na hora. Não dá para desfazer (envie de novo se precisar)." />
  </Fotos>;
}

const Fotos = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; min-width: 0;`;

const Zona = styled("div", transientOptions)<{ $ativa: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(5, 4)};
  border: 1.5px dashed ${({ theme, $ativa }) => ($ativa ? theme.palette.sage[500] : theme.colors.border.default)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme, $ativa }) => ($ativa ? theme.colors.primary.subtle : theme.colors.background.surface)};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  transition: background-color ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast};

  strong { font-size: 0.875rem; color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.medium}; }
`;

const ListaFotos = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  list-style: none;

  &[aria-busy] { opacity: 0.7; }

  > li {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    gap: ${({ theme }) => theme.spacing(3)};
    align-items: start;
    padding: ${({ theme }) => theme.spacing(2.5)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.lg};
    background-color: ${({ theme }) => theme.palette.neutral[0]};

    &[data-arrastando] { opacity: 0.45; }

    ${({ theme }) => theme.media.sm} {
      grid-template-columns: auto auto minmax(0, 1fr);
      > div { grid-column: 1 / -1; }
      > button:last-of-type { grid-column: 3; grid-row: 1; justify-self: end; }
    }
  }
`;

const Quadro = styled.button`
  position: relative;
  width: 4.5rem;
  height: 5.25rem;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.background.surface};
  cursor: zoom-in;

  img { width: 100%; height: 100%; object-fit: cover; }
  > svg { position: absolute; right: 4px; bottom: 4px; padding: 2px; border-radius: 4px; background: rgba(255, 255, 255, 0.85); color: #1d1f1b; }
`;

const Capa = styled.span`
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrast};
  font-size: 0.625rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Campos = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0;`;
const Pequenos = styled.div`
  display: grid;
  grid-template-columns: minmax(8rem, 10rem) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(2)};

  > label { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1.5)}; font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }
`;
