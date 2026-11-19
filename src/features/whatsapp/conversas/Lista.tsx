"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArchiveIcon, CameraIcon, CaretDownIcon, CheckIcon, ChecksIcon, ChatCircleDotsIcon, ClockIcon, EnvelopeSimpleIcon, EnvelopeSimpleOpenIcon, FileTextIcon, MagnifyingGlassIcon,
  MicrophoneIcon, NotePencilIcon, PushPinIcon, PushPinSlashIcon, SpeakerHighIcon, SpeakerSlashIcon, StarIcon, TagIcon, VideoCameraIcon, WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import type { WhatsAppConversation } from "../types";
import { todosRascunhos } from "./cache";
import { Bandeiras, CampoBusca, Chip, Chips, ColunaLista, Contador, Esqueleto, Etiqueta, Hora, Item, ItemTexto, Linha, Nome, Previa, Rolagem, Secao, TituloLista, TopoLista, Vazio } from "./estilos";
import { horaDaLista, nomeDaConversa, rotuloDoTipo, textoSimples } from "./formato";
import { MenuContexto, type Opcao } from "./MenuContexto";
import { ligarSons, sonsLigados } from "./sons";
import type { Aba, useConversas } from "./useConversas";

type Estado = ReturnType<typeof useConversas>;
const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: "todas", rotulo: "Todas" }, { id: "nao_lidas", rotulo: "Não lidas" }, { id: "favoritas", rotulo: "Favoritas" }, { id: "fixadas", rotulo: "Fixadas" }, { id: "arquivadas", rotulo: "Arquivadas" },
];
const ICONE_TIPO: Record<string, typeof CameraIcon> = { image: CameraIcon, video: VideoCameraIcon, audio: MicrophoneIcon, document: FileTextIcon, sticker: CameraIcon };

function Destaque({ texto, termo }: { texto: string; termo: string }) {
  const normal = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const i = normal(texto).indexOf(normal(termo));
  if (!termo || i < 0) return <>{texto}</>;
  const inicio = Math.max(0, i - 24);
  return <>{inicio > 0 ? "…" : ""}{texto.slice(inicio, i)}<mark>{texto.slice(i, i + termo.length)}</mark>{texto.slice(i + termo.length)}</>;
}

function PreviaItem({ c, rascunho, termo }: { c: WhatsAppConversation; rascunho?: string; termo: string }) {
  const naoLida = c.unreadCount > 0;
  if (rascunho) return <Previa $naoLida={naoLida}><em>Rascunho:</em><span>{rascunho}</span></Previa>;
  if (c.match && termo) return <Previa $naoLida={naoLida}><MagnifyingGlassIcon size={13} /><span><Destaque texto={textoSimples(c.match)} termo={termo} /></span></Previa>;
  const Icone = ICONE_TIPO[c.lastType ?? ""];
  const texto = textoSimples((c.lastMessage ?? "").replace(/^\[Template: [^\]]+\]\s*/, "")).replace(/^\[[a-z_]+\]$/, "") || rotuloDoTipo(c.lastType ?? "") || "";
  const saida = c.lastDirection === "outbound";
  return (
    <Previa $naoLida={naoLida}>
      {saida && (c.lastStatus === "read" ? <ChecksIcon size={15} weight="bold" color="var(--lido, #3b82c4)" /> : c.lastStatus === "delivered" ? <ChecksIcon size={15} weight="bold" /> : c.lastStatus === "failed" ? <WarningCircleIcon size={14} weight="fill" color="#c0392b" /> : c.lastStatus === "sending" || c.lastStatus === "unknown" ? <ClockIcon size={13} /> : <CheckIcon size={14} weight="bold" />)}
      {Icone && <Icone size={14} />}
      <span>{saida ? "Você: " : ""}{texto || "Mensagem"}</span>
    </Previa>
  );
}

export function Lista({ estado, aoNovaConversa }: { estado: Estado; aoNovaConversa: () => void }) {
  const { lista, selecionado, setSelecionado, aba, setAba, busca, setBusca, buscaAtiva, etiqueta, setEtiqueta, etiquetas, naoLidas, carregandoLista, temMais, carregarMaisLista, organizar, preCarregar, cancelarPreCarga } = estado;
  const [menu, setMenu] = useState<{ c: WhatsAppConversation; x: number; y: number } | null>(null);
  const [sons, setSons] = useState(true);
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  const fim = useRef<HTMLDivElement>(null);
  const toque = useRef(0);

  useEffect(() => { setSons(sonsLigados()); }, []);
  useEffect(() => { setRascunhos(todosRascunhos()); }, [lista, selecionado]);
  // Rolagem infinita: a 480 px do fim, pede a próxima página.
  useEffect(() => {
    const alvo = fim.current;
    if (!alvo || !temMais) return;
    const observador = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) void carregarMaisLista(); }, { rootMargin: "480px" });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [temMais, carregarMaisLista, lista.length]);

  const opcoes = (c: WhatsAppConversation): Opcao[] => [
    { rotulo: "Abrir conversa", icone: <ChatCircleDotsIcon size={16} />, aoEscolher: () => setSelecionado(c.phone) },
    "separador",
    { rotulo: c.starred ? "Tirar dos favoritos" : "Favoritar", icone: <StarIcon size={16} weight={c.starred ? "fill" : "regular"} />, aoEscolher: () => void organizar(c.phone, { favoritar: !c.starred }) },
    ...(!c.archived ? [{ rotulo: c.pinned ? "Desafixar" : "Fixar no topo", icone: c.pinned ? <PushPinSlashIcon size={16} /> : <PushPinIcon size={16} />, aoEscolher: () => void organizar(c.phone, { fixar: !c.pinned }) }] : []),
    c.unreadCount > 0 || c.markedUnread
      ? { rotulo: "Marcar como lida", icone: <EnvelopeSimpleOpenIcon size={16} />, aoEscolher: () => void organizar(c.phone, { naoLida: false }) }
      : { rotulo: "Marcar como não lida", icone: <EnvelopeSimpleIcon size={16} />, aoEscolher: () => void organizar(c.phone, { naoLida: true }) },
    { rotulo: c.archived ? "Desarquivar" : "Arquivar", icone: <ArchiveIcon size={16} />, aoEscolher: () => void organizar(c.phone, { arquivar: !c.archived }) },
  ];

  const fixadas = aba === "todas" && !buscaAtiva ? lista.filter((c) => c.pinned) : [];
  const recentes = aba === "todas" && !buscaAtiva ? lista.filter((c) => !c.pinned) : lista;
  const linha = (c: WhatsAppConversation, i: number) => {
    const naoLida = c.unreadCount > 0;
    return (
      <Item key={c.phone} type="button" aria-current={c.phone === selecionado} style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
        onClick={() => setSelecionado(c.phone)}
        onPointerEnter={() => preCarregar(c.phone)} onPointerLeave={cancelarPreCarga}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ c, x: e.clientX, y: e.clientY }); }}
        onTouchStart={(e) => { const t = e.touches[0]; toque.current = window.setTimeout(() => setMenu({ c, x: t.clientX, y: t.clientY }), 500); }}
        onTouchEnd={() => window.clearTimeout(toque.current)} onTouchMove={() => window.clearTimeout(toque.current)}>
        <Avatar name={nomeDaConversa(c)} seed={c.phone} size="md" shape="circle" />
        <ItemTexto>
          <Linha><Nome $naoLida={naoLida}>{nomeDaConversa(c)}</Nome><Hora $naoLida={naoLida}>{horaDaLista(c.lastMessageAt)}</Hora></Linha>
          <Linha>
            <PreviaItem c={c} rascunho={c.phone !== selecionado ? rascunhos[c.phone] : undefined} termo={buscaAtiva} />
            <Bandeiras>
              {c.labels?.[0] && <Etiqueta title={c.labels.join(", ")}>{c.labels[0]}{c.labels.length > 1 ? ` +${c.labels.length - 1}` : ""}</Etiqueta>}
              {c.starred && <StarIcon size={14} weight="fill" color="#e0a100" aria-label="Favorita" />}
              {c.pinned && <PushPinIcon size={14} weight="fill" aria-label="Fixada" />}
              {naoLida && <Contador aria-label={`${c.unreadCount} não lidas`}>{c.markedUnread && c.unreadCount === 1 ? "" : c.unreadCount > 99 ? "99+" : c.unreadCount}</Contador>}
            </Bandeiras>
          </Linha>
        </ItemTexto>
      </Item>
    );
  };

  return (
    <ColunaLista data-pane="lista" aria-label="Conversas">
      <TopoLista>
        <TituloLista>
          <h1>Conversas</h1>
          <div>
            <IconButton icon={sons ? SpeakerHighIcon : SpeakerSlashIcon} label={sons ? "Desligar sons" : "Ligar sons"} variant="ghost" size="sm" onClick={() => { ligarSons(!sons); setSons(!sons); }} />
            <IconButton icon={NotePencilIcon} label="Nova conversa" variant="ghost" size="sm" onClick={aoNovaConversa} />
          </div>
        </TituloLista>
        <CampoBusca>
          <MagnifyingGlassIcon size={16} />
          <input type="search" placeholder="Nome, telefone ou mensagem" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar conversas" />
          {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" style={{ border: 0, background: "none", cursor: "pointer", display: "grid", color: "inherit" }}><XIcon size={14} /></button>}
        </CampoBusca>
        <Chips role="tablist" aria-label="Recortes">
          {ABAS.slice(0, 3).map((a) => (
            <Chip key={a.id} type="button" role="tab" aria-selected={aba === a.id && !etiqueta} $ativo={aba === a.id && !etiqueta} onClick={() => { setAba(a.id); setEtiqueta(""); }}>
              {a.rotulo}{a.id === "nao_lidas" && naoLidas > 0 && <small>{naoLidas > 99 ? "99+" : naoLidas}</small>}
            </Chip>
          ))}
          <Menu label="Mais recortes" width="15rem" trigger={(props) => {
            const extra = ABAS.slice(3).find((a) => a.id === aba);
            return <Chip {...props} type="button" $ativo={Boolean(extra || etiqueta)}>{etiqueta ? <><TagIcon size={13} />{etiqueta}</> : extra ? extra.rotulo : "Mais"}<CaretDownIcon size={11} weight="bold" /></Chip>;
          }}>
            {ABAS.slice(3).map((a) => <MenuItem key={a.id} icon={a.id === "fixadas" ? PushPinIcon : ArchiveIcon} selected={aba === a.id && !etiqueta} onSelect={() => { setAba(a.id); setEtiqueta(""); }}>{a.rotulo}</MenuItem>)}
            {etiquetas.length > 0 && <><MenuSeparator /><MenuLabel>Etiquetas</MenuLabel></>}
            {etiquetas.map((e) => <MenuItem key={e} icon={TagIcon} selected={e === etiqueta} onSelect={() => { setAba("todas"); setEtiqueta(e); }}>{e}</MenuItem>)}
            {(aba !== "todas" || etiqueta) && <><MenuSeparator /><MenuItem onSelect={() => { setAba("todas"); setEtiqueta(""); }}>Ver todas</MenuItem></>}
          </Menu>
        </Chips>
      </TopoLista>
      <Rolagem>
        {carregandoLista && !lista.length ? Array.from({ length: 9 }, (_, i) => <Esqueleto key={i} />) : !lista.length ? (
          <Vazio><div><ChatCircleDotsIcon size={32} /><strong>{buscaAtiva ? "Nada encontrado" : "Nenhuma conversa neste recorte"}</strong>{buscaAtiva ? "Procure por outro nome, telefone ou trecho de mensagem." : ""}</div></Vazio>
        ) : (
          <>
            {fixadas.length > 0 && <><Secao>Fixadas</Secao>{fixadas.map(linha)}{recentes.length > 0 && <Secao>Recentes</Secao>}</>}
            {recentes.map((c, i) => linha(c, i + fixadas.length))}
            {temMais && <div ref={fim}><Esqueleto /></div>}
          </>
        )}
      </Rolagem>
      {menu && <MenuContexto x={menu.x} y={menu.y} opcoes={opcoes(menu.c)} aoFechar={() => setMenu(null)} />}
    </ColunaLista>
  );
}
