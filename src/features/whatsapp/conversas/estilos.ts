"use client";

// Visual das conversas trazido do ERP da Le Ange (inbox.module.css), nos tokens deste ERP: lista 22rem | conversa | ficha
// 23rem; fundo pontilhado; balões com rabinho só no 1º do bloco; hora e ticks no canto do balão; separador de dia fixo.
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

const entra = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; }`;
const brilho = keyframes`0% { background-position: -200% 0; } 100% { background-position: 200% 0; }`;
const pulsa = keyframes`0%, 100% { opacity: 1; } 50% { opacity: .35; }`;

export const Raiz = styled.div`
  display: grid;
  flex: 1 1 0;
  min-height: 0;
  grid-template-columns: 22rem minmax(0, 1fr);
  background: ${({ theme }) => theme.colors.background.surface};
  @media (max-width: 960px) { grid-template-columns: 18.5rem minmax(0, 1fr); }
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr) !important;
    &[data-aberta] > [data-pane="lista"], &:not([data-aberta]) > [data-pane="conversa"] { display: none; }
  }
`;

/* ------------------------------------------------------------------ lista */
export const ColunaLista = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.palette.neutral[0]};
`;
export const TopoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};
  padding: ${({ theme }) => theme.spacing(4, 3, 2)};
`;
export const TituloLista = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  h1 { font-size: 1.25rem; font-weight: 650; letter-spacing: -0.01em; }
  > div { display: flex; gap: ${({ theme }) => theme.spacing(1)}; }
`;
export const CampoBusca = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.palette.neutral[100]};
  color: ${({ theme }) => theme.colors.text.muted};
  &:focus-within { box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary.main}40; }
  input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit; font-size: 0.875rem; color: ${({ theme }) => theme.colors.text.primary}; outline: none; }
  input::-webkit-search-cancel-button { display: none; }
`;
export const Chips = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;
export const Chip = styled("button", transientOptions)<{ $ativo?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  flex-shrink: 0;
  height: 1.875rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border: 1px solid ${({ theme, $ativo }) => ($ativo ? "transparent" : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme, $ativo }) => ($ativo ? theme.colors.primary.main : "transparent")};
  color: ${({ theme, $ativo }) => ($ativo ? "#fff" : theme.colors.text.secondary)};
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
  &:hover { background: ${({ theme, $ativo }) => ($ativo ? theme.colors.primary.main : theme.palette.neutral[100])}; }
  max-width: 9rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  small { font-size: 0.6875rem; opacity: 0.8; }
`;
export const Rolagem = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: ${({ theme }) => theme.spacing(1, 2, 3)};
  /* Celular: espaço para a barra flutuante do ERP não cobrir as últimas conversas. */
  @media (max-width: 767px) { padding-bottom: 6rem; }
`;
export const Secao = styled.p`
  padding: ${({ theme }) => theme.spacing(3, 2, 1)};
  font-size: 0.6875rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
`;
export const Item = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing(2.5, 2)};
  border: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  animation: ${entra} 220ms ease both;
  &:hover { background: ${({ theme }) => theme.palette.neutral[50] ?? theme.palette.neutral[100]}; }
  &[aria-current="true"] { background: ${({ theme }) => theme.palette.neutral[100]}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: -2px; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
export const ItemTexto = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;
export const Linha = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;
`;
export const Nome = styled("strong", transientOptions)<{ $naoLida?: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9375rem;
  font-weight: ${({ $naoLida }) => ($naoLida ? 650 : 500)};
`;
export const Hora = styled("span", transientOptions)<{ $naoLida?: boolean }>`
  flex-shrink: 0;
  font-size: 0.75rem;
  color: ${({ theme, $naoLida }) => ($naoLida ? theme.colors.success : theme.colors.text.muted)};
  font-weight: ${({ $naoLida }) => ($naoLida ? 600 : 400)};
`;
export const Previa = styled("span", transientOptions)<{ $naoLida?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme, $naoLida }) => ($naoLida ? theme.colors.text.primary : theme.colors.text.secondary)};
  > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  svg { flex-shrink: 0; }
  mark { background: ${({ theme }) => theme.tones.yellow.bg}; color: inherit; border-radius: 2px; }
  em { font-style: normal; color: ${({ theme }) => theme.colors.danger}; }
`;
export const Bandeiras = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.muted};
`;
export const Contador = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.success};
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 650;
`;
export const Etiqueta = styled.span`
  display: inline-flex;
  align-items: center;
  height: 1.125rem;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme }) => theme.tones.lavender.bg};
  color: ${({ theme }) => theme.tones.lavender.fg};
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
`;
export const Esqueleto = styled.div`
  height: 3.75rem;
  margin: ${({ theme }) => theme.spacing(1, 0)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(90deg, ${({ theme }) => theme.palette.neutral[100]} 25%, ${({ theme }) => theme.palette.neutral[50] ?? theme.palette.neutral[0]} 50%, ${({ theme }) => theme.palette.neutral[100]} 75%);
  background-size: 200% 100%;
  animation: ${brilho} 1.4s linear infinite;
`;
export const Vazio = styled.div`
  display: grid;
  place-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  height: 100%;
  padding: ${({ theme }) => theme.spacing(8)};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  svg { color: ${({ theme }) => theme.colors.text.muted}; }
  strong { display: block; color: ${({ theme }) => theme.colors.text.primary}; font-size: 1rem; }
`;

/* ------------------------------------------------------------------ conversa */
export const ColunaConversa = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  &[data-painel] { grid-template-columns: minmax(0, 1fr) 23rem; }
  @media (max-width: 1280px) { &[data-painel] { grid-template-columns: minmax(0, 1fr); } }
`;
export const Miolo = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: ${({ theme }) => theme.colors.background.surface};
  background-image: radial-gradient(${({ theme }) => theme.colors.chat.dots} 1px, transparent 1px);
  background-size: 1.125rem 1.125rem;
`;
export const SoCelular = styled.span`
  display: none;
  @media (max-width: 767px) { display: contents; }
`;
export const Cabecalho = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-height: 3.75rem;
  padding: ${({ theme }) => theme.spacing(2, 4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.palette.neutral[0]};
  z-index: 2;
`;
export const CabecalhoNome = styled.button`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9375rem; font-weight: 600; }
  > span { display: flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; min-width: 0; overflow: hidden; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
  > span > em { font-style: normal; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 767px) { > span > em { display: none; } }
`;
export const Janela = styled("span", transientOptions)<{ $aberta: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 1.25rem;
  padding: 0 7px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme, $aberta }) => ($aberta ? theme.tones.green.bg : theme.tones.peach.bg)};
  color: ${({ theme, $aberta }) => ($aberta ? theme.tones.green.fg : theme.tones.peach.fg)} !important;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  line-height: 1.25rem;
`;
export const AcoesCabecalho = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`;
export const Mensagens = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: ${({ theme }) => theme.spacing(3)} clamp(1rem, 5%, 3.5rem) calc(var(--compositor-h, 5rem) + ${({ theme }) => theme.spacing(4)});
`;
export const Dia = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.spacing(2)};
  z-index: 1;
  display: flex;
  justify-content: center;
  margin: ${({ theme }) => theme.spacing(3, 0)};
  pointer-events: none;
  span {
    padding: ${({ theme }) => theme.spacing(1, 3)};
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ theme }) => theme.palette.neutral[0]}e6;
    backdrop-filter: blur(8px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    font-size: 0.75rem;
    font-weight: 550;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;
export const LinhaMensagem = styled("div", transientOptions)<{ $saida: boolean; $primeira: boolean }>`
  position: relative;
  display: flex;
  /* Com row-reverse, o início do eixo é a direita: flex-start encosta as enviadas na direita. */
  justify-content: flex-start;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  flex-direction: ${({ $saida }) => ($saida ? "row-reverse" : "row")};
  margin-top: ${({ theme, $primeira }) => ($primeira ? theme.spacing(2.5) : "2px")};
  &:hover [data-acoes] { opacity: 1; }
`;
export const Balao = styled("div", transientOptions)<{ $saida: boolean; $primeira: boolean; $midia?: boolean; $falhou?: boolean }>`
  position: relative;
  max-width: min(36rem, 78%);
  padding: ${({ $midia }) => ($midia ? "4px" : "6px 9px 5px")};
  border-radius: 0.75rem;
  ${({ $primeira, $saida }) => ($primeira ? ($saida ? "border-top-right-radius: 0;" : "border-top-left-radius: 0;") : "")}
  background: ${({ theme, $saida }) => ($saida ? theme.colors.chat.outgoing : theme.palette.neutral[0])};
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06);
  outline: ${({ theme, $falhou }) => ($falhou ? `1px solid ${theme.colors.danger}` : "none")};
  font-size: 0.9375rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  animation: ${entra} 180ms ease both;
  ${({ $primeira, $saida, theme }) => $primeira ? `&::before { content: ""; position: absolute; top: 0; ${$saida ? "right: -7px" : "left: -7px"}; width: 8px; height: 13px; background: ${$saida ? theme.colors.chat.outgoing : theme.palette.neutral[0]}; clip-path: ${$saida ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)"}; }` : ""}
  @media (prefers-reduced-motion: reduce) { animation: none; }
  @media (max-width: 767px) { max-width: 88%; }
  a { color: ${({ theme }) => theme.colors.text.brand}; text-decoration: underline; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
`;
export const Texto = styled.div`
  white-space: pre-wrap;
  &::after { content: ""; display: inline-block; width: var(--espaco-hora, 4.25rem); }
`;
export const Rodape = styled("span", transientOptions)<{ $sobreMidia?: boolean }>`
  position: absolute;
  right: ${({ $sobreMidia }) => ($sobreMidia ? "10px" : "8px")};
  bottom: ${({ $sobreMidia }) => ($sobreMidia ? "10px" : "4px")};
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: ${({ $sobreMidia }) => ($sobreMidia ? "1px 6px" : "0")};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $sobreMidia }) => ($sobreMidia ? "rgba(0,0,0,.45)" : "transparent")};
  color: ${({ theme, $sobreMidia }) => ($sobreMidia ? "#fff" : theme.colors.text.muted)};
  font-size: 0.6875rem;
  line-height: 1;
  white-space: nowrap;
  [data-lido] { color: ${({ theme }) => theme.colors.chat.read}; }
  [data-falhou] { color: ${({ theme }) => theme.colors.danger}; }
`;
export const AcoesBalao = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 120ms ease;
  @media (hover: none) { display: none; }
  button {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 0;
    border-radius: 50%;
    background: ${({ theme }) => theme.palette.neutral[0]};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;
    &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
  }
`;
export const Citacao = styled("button", transientOptions)<{ $saida?: boolean }>`
  display: grid;
  gap: 1px;
  width: 100%;
  margin-bottom: 4px;
  padding: 5px 8px;
  border: 0;
  border-left: 3px solid ${({ theme, $saida }) => ($saida ? theme.colors.primary.main : theme.tones.teal.fg)};
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  strong { font-size: 0.75rem; color: ${({ theme, $saida }) => ($saida ? theme.colors.primary.main : theme.tones.teal.fg)}; }
  span { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.secondary}; }
`;
export const Reacoes = styled.div`
  position: absolute;
  bottom: -0.875rem;
  left: 0.5rem;
  display: flex;
  gap: 1px;
  padding: 1px 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.palette.neutral[0]};
  font-size: 0.8125rem;
  line-height: 1.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  z-index: 1;
`;
export const Foto = styled.button`
  display: block;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: ${({ theme }) => theme.palette.neutral[100]};
  cursor: zoom-in;
  img, video { display: block; width: 100%; max-width: 20rem; max-height: 22rem; object-fit: cover; }
`;
export const Documento = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  min-width: 14rem;
  padding: ${({ theme }) => theme.spacing(2.5)};
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.04);
  color: inherit !important;
  text-decoration: none !important;
  div { display: grid; min-width: 0; }
  strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; font-weight: 550; }
  span { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
export const Legenda = styled.div`
  padding: 4px 6px 2px;
  white-space: pre-wrap;
  &::after { content: ""; display: inline-block; width: 4.25rem; }
`;
export const PassoEnvio = styled.div`
  margin-top: 2px;
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: right;
  animation: ${pulsa} 1.6s ease infinite;
`;
export const Falha = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: 2px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.danger};
  button { border: 0; background: none; color: inherit; font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }
`;
export const IrParaFim = styled.button`
  position: absolute;
  right: clamp(1rem, 4%, 2.5rem);
  bottom: calc(var(--compositor-h, 5rem) + 1rem);
  z-index: 3;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 50%;
  background: ${({ theme }) => theme.palette.neutral[0]};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  span { position: absolute; top: -6px; right: -6px; }
`;

/* ------------------------------------------------------------------ compositor */
export const Doca = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  padding: ${({ theme }) => theme.spacing(2)} clamp(0.75rem, 4%, 3rem) ${({ theme }) => theme.spacing(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.palette.neutral[0]};
  &[data-arrastando] { outline: 2px dashed ${({ theme }) => theme.colors.primary.main}; outline-offset: -6px; }
`;
export const BarraCompositor = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing(1.5)};
  textarea {
    flex: 1;
    min-height: 2.5rem;
    max-height: 11rem;
    padding: ${({ theme }) => theme.spacing(2.25, 3)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ theme }) => theme.palette.neutral[0]};
    color: ${({ theme }) => theme.colors.text.primary};
    font: inherit;
    font-size: 0.9375rem;
    line-height: 1.4;
    resize: none;
    outline: none;
    &:focus { border-color: ${({ theme }) => theme.colors.primary.main}; }
  }
`;
export const BotaoRedondo = styled("button", transientOptions)<{ $principal?: boolean; $perigo?: boolean }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $principal, $perigo }) => ($perigo ? theme.tones.rose.bg : $principal ? theme.colors.primary.main : "transparent")};
  color: ${({ theme, $principal, $perigo }) => ($perigo ? theme.colors.danger : $principal ? "#fff" : theme.colors.text.secondary)};
  cursor: pointer;
  transition: background-color 120ms ease, transform 120ms ease;
  &:hover:not(:disabled) { background: ${({ theme, $principal, $perigo }) => ($perigo ? theme.tones.rose.soft ?? theme.tones.rose.bg : $principal ? theme.colors.primary.main : theme.palette.neutral[100])}; }
  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;
export const Anexos = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.spacing(2)};
`;
export const Anexo = styled.div`
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.palette.neutral[100]};
  overflow: hidden;
  font-size: 0.6875rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  img, video { width: 100%; height: 100%; object-fit: cover; }
  > button { position: absolute; top: 2px; right: 2px; display: grid; place-items: center; width: 1.25rem; height: 1.25rem; border: 0; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; }
  > small { position: absolute; bottom: 2px; left: 2px; right: 2px; padding: 0 2px; border-radius: 3px; background: rgba(0,0,0,.55); color: #fff; font-size: 0.625rem; }
`;
export const Respondendo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(2, 3)};
  border-left: 3px solid ${({ theme }) => theme.colors.primary.main};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.palette.neutral[100]};
  font-size: 0.8125rem;
  div { flex: 1; min-width: 0; display: grid; }
  strong { font-size: 0.75rem; color: ${({ theme }) => theme.colors.primary.main}; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${({ theme }) => theme.colors.text.secondary}; }
`;
export const Gravando = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  flex: 1;
  height: 2.5rem;
  padding: ${({ theme }) => theme.spacing(0, 3)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[100]};
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  [data-ponto] { width: 0.625rem; height: 0.625rem; border-radius: 50%; background: ${({ theme }) => theme.colors.danger}; animation: ${pulsa} 1.2s ease infinite; }
  [data-ondas] { display: flex; align-items: center; gap: 2px; flex: 1; height: 1.5rem; overflow: hidden; }
  [data-ondas] i { flex: 0 0 3px; border-radius: 2px; background: ${({ theme }) => theme.colors.primary.main}; }
`;
export const Folha = styled.div`
  position: absolute;
  left: clamp(0.75rem, 4%, 3rem);
  right: clamp(0.75rem, 4%, 3rem);
  bottom: calc(100% + 6px);
  max-height: min(18rem, 50vh);
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing(1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[0]};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  button[data-opcao] {
    display: grid;
    gap: 2px;
    width: 100%;
    padding: ${({ theme }) => theme.spacing(2, 2.5)};
    border: 0;
    border-radius: ${({ theme }) => theme.radii.md};
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    &[aria-selected="true"], &:hover { background: ${({ theme }) => theme.palette.neutral[100]}; }
    strong { font-size: 0.8125rem; }
    span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.secondary}; }
  }
`;
export const JanelaFechada = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing(2.5, 3)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.tones.peach.bg};
  color: ${({ theme }) => theme.tones.peach.fg};
  font-size: 0.8125rem;
`;

/* ------------------------------------------------------------------ ficha do contato */
export const Painel = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.palette.neutral[0]};
  @media (max-width: 1280px) { position: absolute; top: 0; right: 0; bottom: 0; width: min(23rem, 100%); z-index: 5; box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12); }
  @media (max-width: 767px) { width: 100%; }
`;
export const BlocoPainel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  h3 { font-size: 0.75rem; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; color: ${({ theme }) => theme.colors.text.muted}; }
`;
export const GradeMidia = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  button { aspect-ratio: 1; padding: 0; border: 0; border-radius: 6px; overflow: hidden; background: ${({ theme }) => theme.palette.neutral[100]}; cursor: pointer; }
  img { width: 100%; height: 100%; object-fit: cover; }
`;

/* ------------------------------------------------------------------ menu de contexto */
export const MenuFlutuante = styled.div`
  position: fixed;
  z-index: 50;
  min-width: 13rem;
  padding: ${({ theme }) => theme.spacing(1.5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[0]};
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  animation: ${entra} 120ms ease both;
  button {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2.5)};
    width: 100%;
    padding: ${({ theme }) => theme.spacing(2, 2.5)};
    border: 0;
    border-radius: ${({ theme }) => theme.radii.md};
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
    &:hover, &:focus-visible { background: ${({ theme }) => theme.palette.neutral[100]}; outline: none; }
    &[data-perigo] { color: ${({ theme }) => theme.colors.danger}; }
  }
  hr { margin: ${({ theme }) => theme.spacing(1, 0)}; border: 0; border-top: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  [data-reacoes] { display: flex; justify-content: space-between; padding: ${({ theme }) => theme.spacing(1)}; }
  [data-reacoes] button { justify-content: center; width: 2.25rem; padding: 4px; font-size: 1.25rem; }
`;
