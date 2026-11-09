"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { DotsSixVerticalIcon, ImageIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { useCurrentUser } from "@/features/settings/store";
import { transientOptions } from "@/lib/emotion/transient";
import { maskCurrency } from "@/lib/masks";
import { Notice } from "@/features/operations/components/ui";
import type { RespostaImagensLoja } from "@/features/ecommerce/types";
import { centavosDe, erpRequest, loja, requestError, tamanho } from "./api";

// Peças comuns das telas do catálogo: permissão de escrita, carregamento, confirmação, reordenar
// (arrastar ou setas), campo de reais, contador de caracteres, imagem da loja e aviso ao sair sem salvar.

/** Escrita do catálogo: só administração e gestão (a API recusa os demais com 403). */
export function usePodeEditar() {
  const usuario = useCurrentUser();
  return usuario?.permission === "admin" || usuario?.permission === "manager";
}

export function AvisoSomenteLeitura({ oque }: { oque: string }) {
  return <Notice>Seu perfil pode consultar {oque}. Criar, editar e excluir fica com a administração e a gestão do ateliê.</Notice>;
}

/** GET com cancelamento ao trocar de tela; `recarregar` refaz sem limpar o que já está na tela. */
export function useRecurso<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(Boolean(caminho));
  const [erro, setErro] = useState("");
  const recarregar = useCallback(async (signal?: AbortSignal) => {
    if (!caminho) return;
    setCarregando(true); setErro("");
    try { setDados(await erpRequest<T>(caminho, { signal })); }
    catch (caught) { if (!signal?.aborted) setErro(requestError(caught)); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }, [caminho]);
  useEffect(() => { const controle = new AbortController(); void recarregar(controle.signal); return () => controle.abort(); }, [recarregar]);
  return { dados, setDados, carregando, erro, recarregar } as const;
}

/** Confirmação antes de ações sem volta (excluir, arquivar…). */
export function Confirmar({ aberto, titulo, descricao, acao, perigo = true, ocupado = false, onConfirmar, onFechar }: {
  aberto: boolean; titulo: string; descricao: ReactNode; acao: string; perigo?: boolean; ocupado?: boolean; onConfirmar: () => void; onFechar: () => void;
}) {
  return <Dialog open={aberto} onClose={() => { if (!ocupado) onFechar(); }} title={titulo} description={descricao} width="26rem"
    footer={<><Button variant="ghost" disabled={ocupado} onClick={onFechar}>Voltar</Button><Button variant={perigo ? "danger" : "primary"} loading={ocupado} onClick={onConfirmar}>{acao}</Button></>} />;
}

/* ---------- Reordenar ---------- */

/** Move um item de `de` para `para` (cópia nova). */
export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de === para) return [...lista];
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

/**
 * Arrastar para reordenar (como as etapas dos funis): a linha troca de lugar quando o cursor passa do
 * meio da vizinha. `onMover` recebe a lista nova; `onSoltar` roda ao terminar (para gravar).
 * Teclado: setas na alça.
 */
export function useArrastar<T extends { id: string }>(lista: readonly T[], onMover: (nova: T[]) => void, onSoltar?: (nova: T[]) => void, ativo = true) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  // A linha só fica arrastável enquanto a alça está pressionada (os campos dentro dela seguem selecionáveis).
  const [pegando, setPegando] = useState<string | null>(null);
  const atual = useRef(lista);
  atual.current = lista;
  useEffect(() => {
    if (!pegando) return;
    const soltar = () => setPegando(null);
    window.addEventListener("pointerup", soltar);
    return () => window.removeEventListener("pointerup", soltar);
  }, [pegando]);
  const linha = (item: T, posicao: number) => (!ativo ? {} : {
    draggable: pegando === item.id || arrastando === item.id,
    "data-arrastando": arrastando === item.id ? "" : undefined,
    onDragStart: (event: DragEvent<HTMLElement>) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setArrastando(item.id); },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!arrastando) return;
      const de = atual.current.findIndex((outro) => outro.id === arrastando);
      if (de < 0) return;
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      if (de === posicao) return;
      const caixa = event.currentTarget.getBoundingClientRect();
      const meio = caixa.top + caixa.height / 2;
      if ((de < posicao && event.clientY < meio) || (de > posicao && event.clientY > meio)) return;
      onMover(mover(atual.current, de, posicao));
    },
    onDrop: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onDragEnd: () => { if (arrastando) onSoltar?.([...atual.current]); setArrastando(null); setPegando(null); },
  });
  /** Props da alça: pressionar libera o arrastar da linha; setas movem pelo teclado. */
  const alca = (item: T, posicao: number) => ({ onPointerDown: () => { if (ativo) setPegando(item.id); }, onKeyDown: teclas(posicao) });
  const teclas = (posicao: number) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const para = posicao + (event.key === "ArrowUp" ? -1 : 1);
    if (para < 0 || para >= atual.current.length) return;
    const nova = mover(atual.current, posicao, para);
    onMover(nova); onSoltar?.(nova);
    const alvo = event.currentTarget;
    requestAnimationFrame(() => alvo.focus());
  };
  return { linha, alca, teclas, arrastando } as const;
}

export const AlcaBotao = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: grab;
  touch-action: none;

  &:hover { background-color: ${({ theme }) => theme.colors.interactive.hover}; color: ${({ theme }) => theme.colors.text.primary}; }
  &:disabled { cursor: default; opacity: 0.4; }
`;

export function Alca({ rotulo, onKeyDown, onPointerDown, disabled }: { rotulo: string; onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void; onPointerDown?: () => void; disabled?: boolean }) {
  return <AlcaBotao type="button" aria-label={`${rotulo}. Arraste ou use as setas para mudar a ordem`} title="Arraste ou use as setas para reordenar" onKeyDown={onKeyDown} onPointerDown={onPointerDown} disabled={disabled}>
    <DotsSixVerticalIcon size={16} weight="bold" aria-hidden />
  </AlcaBotao>;
}

/* ---------- Campos ---------- */

/** Reais com máscara de maquininha; o valor é em centavos (null = vazio). */
export function CampoReais({ rotulo, valor, onChange, dica, erro, disabled, placeholder, ocultarRotulo }: {
  rotulo: string; valor: number | null; onChange: (centavos: number | null) => void; dica?: ReactNode; erro?: string; disabled?: boolean; placeholder?: string; ocultarRotulo?: boolean;
}) {
  return <TextField label={rotulo} hideLabel={ocultarRotulo} inputMode="numeric" value={valor === null ? "" : maskCurrency(String(valor))} mask={maskCurrency} onChange={(event) => onChange(centavosDe(event.target.value))} hint={dica} error={erro} disabled={disabled} placeholder={placeholder ?? "R$ 0,00"} />;
}

/** "12/70": vira aviso quando passa do limite. */
export function Contador({ texto, limite, ideal }: { texto: string; limite: number; ideal?: string }) {
  const usados = tamanho(texto);
  return <ContadorTexto $passou={usados > limite}>{usados}/{limite}{ideal ? ` · ${ideal}` : ""}</ContadorTexto>;
}
const ContadorTexto = styled("span", transientOptions)<{ $passou: boolean }>`
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $passou }) => ($passou ? theme.colors.danger : "inherit")};
`;

/** Imagem de categoria/menu: só arquivos da loja (/vitrine/…). Escolhe entre os existentes ou digita. */
export function CampoImagemLoja({ rotulo, valor, onChange, disabled, dica }: { rotulo: string; valor: string; onChange: (caminho: string) => void; disabled?: boolean; dica?: string }) {
  const [opcoes, setOpcoes] = useState<RespostaImagensLoja["imagens"] | null>(null);
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => { setQuebrada(false); }, [valor]);
  useEffect(() => {
    const controle = new AbortController();
    erpRequest<RespostaImagensLoja>(loja("categorias/imagens"), { signal: controle.signal }).then((resposta) => setOpcoes(resposta.imagens)).catch(() => { if (!controle.signal.aborted) setOpcoes([]); });
    return () => controle.abort();
  }, []);
  const valido = !valor || (/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|avif)$/.test(valor) && !valor.includes(".."));
  return <ImagemCampo>
    <Miniatura aria-hidden>{valor && valido && !quebrada ? <img src={valor} alt="" onError={() => setQuebrada(true)} /> : <ImageIcon size={20} />}</Miniatura>
    <div>
      <TextField label={rotulo} value={valor} placeholder="/vitrine/menu/kit-berco/kits.webp" disabled={disabled} onChange={(event) => onChange(event.target.value.trim())}
        error={valido ? undefined : "Use um arquivo da loja: /vitrine/…/arquivo.webp (também .jpg, .png ou .avif)."}
        hint={quebrada ? "O arquivo não abriu aqui: confira se ele está em public/vitrine." : (dica ?? "Opcional. Arquivo da pasta pública da loja (public/vitrine). Sem imagem, a loja usa a composição de cor.")} />
      {opcoes && opcoes.length > 0 && <Select label="Escolher imagem existente" placeholder="Escolher uma imagem da loja" searchable value={opcoes.some((opcao) => opcao.caminho === valor) ? valor : null}
        onChange={(caminho) => onChange(caminho)} options={opcoes.map((opcao) => ({ value: opcao.caminho, label: opcao.caminho.replace(/^\/vitrine\//, ""), meta: opcao.emUso ? "em uso" : undefined }))}
        trigger={({ open: _open, ...props }) => <Button size="sm" variant="ghost" icon={ImageIcon} disabled={disabled} {...props}>Escolher entre as imagens da loja ({opcoes.length})</Button>} />}
    </div>
  </ImagemCampo>;
}
const ImagemCampo = styled.div`
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: start;

  > div { display: flex; flex-direction: column; align-items: flex-start; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; > :first-of-type { align-self: stretch; } }
`;
export const Miniatura = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  overflow: hidden;
  margin-top: 1.4rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.background.surface};
  color: ${({ theme }) => theme.colors.text.muted};

  img { width: 100%; height: 100%; object-fit: cover; }
`;

/* ---------- Alterações não salvas ---------- */

/**
 * Com alterações não salvas: o navegador pergunta ao fechar/recarregar e os links internos abrem a
 * confirmação "Sair sem salvar?". Devolve a janela de confirmação para a tela renderizar.
 */
export function useAvisoAoSair(sujo: boolean) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);
  const sujoRef = useRef(sujo);
  sujoRef.current = sujo;

  useEffect(() => {
    const antesDeSair = (event: BeforeUnloadEvent) => { if (!sujoRef.current) return; event.preventDefault(); event.returnValue = ""; };
    // Captura na janela: roda antes do Link do Next e da barra de progresso.
    const clique = (event: MouseEvent) => {
      if (!sujoRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault(); event.stopPropagation();
      setDestino(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", antesDeSair);
    window.addEventListener("click", clique, true);
    return () => { window.removeEventListener("beforeunload", antesDeSair); window.removeEventListener("click", clique, true); };
  }, []);

  const janela = <Dialog open={destino !== null} onClose={() => setDestino(null)} title="Sair sem salvar?" description="As alterações desta tela ainda não foram salvas e serão perdidas." width="24rem"
    footer={<><Button variant="ghost" onClick={() => setDestino(null)}>Continuar editando</Button><Button variant="danger" onClick={() => { const alvo = destino; sujoRef.current = false; setDestino(null); if (alvo) { startNavigationProgress(); router.push(alvo); } }}>Sair sem salvar</Button></>} />;
  return { janela, liberar: () => { sujoRef.current = false; } } as const;
}

/* ---------- Estilos comuns ---------- */

export const Linha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
`;

export const Sub = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  overflow-wrap: anywhere;
`;

export const Caminho = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  overflow-wrap: anywhere;
`;

/** Aviso amarelo (limitações, efeitos colaterais). */
export function Atencao({ children }: { children: ReactNode }) {
  return <AtencaoCaixa role="note"><WarningCircleIcon size={16} weight="bold" aria-hidden /><span>{children}</span></AtencaoCaixa>;
}
const AtencaoCaixa = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(3, 4)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.tones.peach.bg};
  color: ${({ theme }) => theme.tones.peach.fg};
  font-size: 0.8125rem;
  line-height: 1.6;

  svg { flex-shrink: 0; margin-top: 3px; }
`;

/**
 * Botões do cabeçalho da página. No celular o título divide a linha com eles: os botões com ícone
 * viram quadradinhos (o texto continua acessível, só fica visualmente escondido).
 */
export const AcoesCabecalho = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};

  ${({ theme }) => theme.media.md} {
    flex-shrink: 0;
    gap: ${({ theme }) => theme.spacing(1.5)};

    > a:has([data-icon="start"]), > button:has([data-icon="start"]), > a:has([aria-busy]), > button[aria-busy] {
      width: 2.25rem;
      padding: 0;
      justify-content: center;
    }
    > a:has([data-icon="start"]) [data-button-label], > button:has([data-icon="start"]) [data-button-label], > button[aria-busy] [data-button-label] {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
`;
