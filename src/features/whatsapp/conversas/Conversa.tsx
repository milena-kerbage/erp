"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveIcon, ArrowBendUpLeftIcon, ArrowDownIcon, ArrowLeftIcon, CopyIcon, DotsThreeVerticalIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, IdentificationCardIcon, PushPinIcon, PushPinSlashIcon, StarIcon, TagIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Lightbox } from "@/components/ui/Lightbox";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import type { WhatsAppConversation, WhatsAppMessage } from "../types";
import { Bolha, urlDaMidia } from "./Bolha";
import { Compositor } from "./Compositor";
import { AcoesCabecalho, Cabecalho, CabecalhoNome, ColunaConversa, Contador, Dia, IrParaFim, Janela, Mensagens, Miolo, SoCelular, Vazio } from "./estilos";
import { janelaAberta, mesmoDia, nomeDaConversa, rotuloDoDia, telefoneFormatado, textoDaMensagem } from "./formato";
import { MenuContexto } from "./MenuContexto";
import { ModeloDialog } from "./ModeloDialog";
import { PainelContato } from "./PainelContato";
import type { Fio, useConversas } from "./useConversas";

type Estado = ReturnType<typeof useConversas>;
/** Hora de fim da janela; "amanhã 09:30" quando passa da meia-noite. */
function horaJanela(iso: string) {
  const fim = new Date(iso), hora = fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return fim.toDateString() === new Date().toDateString() ? hora : `amanhã ${hora}`;
}
const REACOES_RAPIDAS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const BLOCO_MS = 5 * 60_000;

export function Conversa({ estado, phone, conversa, fio, painel, setPainel }: { estado: Estado; phone: string; conversa: WhatsAppConversation | null; fio?: Fio; painel: boolean; setPainel: (aberto: boolean) => void }) {
  const { setSelecionado, organizar, enviarTexto, enviarArquivo, descartarFalha, reenviarFalha, reagir, carregarAntigas, etiquetas, removerDaLista, recarregarFio } = estado;
  const mensagens = useMemo(() => fio?.messages ?? [], [fio?.messages]);
  const [respondendo, setRespondendo] = useState<WhatsAppMessage | null>(null);
  const [menu, setMenu] = useState<{ m: WhatsAppMessage; x: number; y: number; soReacao?: boolean } | null>(null);
  const [foto, setFoto] = useState<number | null>(null);
  const [modelo, setModelo] = useState(false);
  const [altura, setAltura] = useState(80);
  const [noFim, setNoFim] = useState(true);
  const [novas, setNovas] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const ancora = useRef<{ altura: number; topo: number } | null>(null);
  const ultimaId = useRef<string | undefined>(undefined);
  const nome = conversa ? nomeDaConversa(conversa) : telefoneFormatado(phone);
  const aberta = janelaAberta(conversa);

  // Troca de conversa: abre no fim e limpa a resposta.
  useEffect(() => { setRespondendo(null); setNovas(0); setNoFim(true); ultimaId.current = undefined; }, [phone]);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el || !mensagens.length) return;
    // Mensagens antigas entraram no topo: mantém o que estava na tela no mesmo lugar.
    if (ancora.current) { el.scrollTop = el.scrollHeight - ancora.current.altura + ancora.current.topo; ancora.current = null; return; }
    const ultima = mensagens[mensagens.length - 1];
    if (ultimaId.current === undefined) { el.scrollTop = el.scrollHeight; ultimaId.current = ultima.id; return; }
    if (ultima.id !== ultimaId.current) {
      ultimaId.current = ultima.id;
      if (noFim || ultima.direction === "outbound") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      else if (ultima.direction === "inbound") setNovas((n) => n + 1);
    }
  }, [mensagens, noFim]);

  const aoRolar = useCallback(() => {
    const el = area.current;
    if (!el) return;
    const fim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setNoFim(fim);
    if (fim) setNovas(0);
    if (el.scrollTop < 160 && fio?.nextBefore && !fio.carregandoAntigas) {
      ancora.current = { altura: el.scrollHeight, topo: el.scrollTop };
      void carregarAntigas(phone).then((ok) => { if (!ok) ancora.current = null; });
    }
  }, [fio?.nextBefore, fio?.carregandoAntigas, carregarAntigas, phone]);

  const irParaFim = () => { area.current?.scrollTo({ top: area.current.scrollHeight, behavior: "smooth" }); setNovas(0); };
  const irPara = (id: string) => {
    const alvo = document.getElementById(`m-${id}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    alvo.animate([{ background: "rgba(59,130,196,.18)" }, { background: "transparent" }], { duration: 1400, easing: "ease-out" });
  };

  // Esc fecha a conversa (sem diálogo, menu ou resposta abertos).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented && !menu && foto === null && !modelo && !respondendo && !document.querySelector('[role="dialog"]')) setSelecionado(undefined); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [menu, foto, modelo, respondendo, setSelecionado]);

  const fotos = useMemo(() => mensagens.filter((m) => m.type === "image" && (m.hasMedia || m.local?.previewUrl)), [mensagens]);
  const abrirFoto = (m: WhatsAppMessage) => {
    if (m.type === "video") { window.open(m.local?.previewUrl ?? urlDaMidia(m), "_blank", "noopener"); return; }
    const i = fotos.findIndex((f) => f.id === m.id);
    if (i >= 0) setFoto(i);
  };

  // Dia + blocos (mesmo lado, até 5 min entre uma e outra): só a primeira do bloco tem rabinho.
  const itens = useMemo(() => mensagens.map((m, i) => {
    const anterior = mensagens[i - 1];
    const novoDia = !anterior || !mesmoDia(anterior.createdAt, m.createdAt);
    const primeira = novoDia || anterior.direction !== m.direction || Date.parse(m.createdAt) - Date.parse(anterior.createdAt) > BLOCO_MS;
    return { m, novoDia, primeira };
  }), [mensagens]);
  const dias = useMemo(() => {
    const grupos: Array<{ chave: string; itens: typeof itens }> = [];
    for (const item of itens) {
      if (item.novoDia || !grupos.length) grupos.push({ chave: item.m.createdAt.slice(0, 10) + item.m.id, itens: [] });
      grupos[grupos.length - 1].itens.push(item);
    }
    return grupos;
  }, [itens]);

  return (
    <ColunaConversa data-pane="conversa" data-painel={(painel && conversa) || undefined}>
      <Miolo style={{ ["--compositor-h" as string]: `${altura}px` }}>
      <Cabecalho>
        <SoCelular><IconButton icon={ArrowLeftIcon} label="Voltar para a lista" variant="ghost" size="sm" onClick={() => setSelecionado(undefined)} /></SoCelular>
        <Avatar name={nome} seed={phone} size="sm" shape="circle" />
        <CabecalhoNome type="button" onClick={() => setPainel(!painel)} aria-label="Abrir a ficha do contato">
          <strong>{nome}</strong>
          <span>{nome !== telefoneFormatado(phone) && <em>{telefoneFormatado(phone)}</em>}<Janela $aberta={aberta} title={aberta ? "Janela de 24 horas aberta: dá para responder com texto, foto, áudio e documento." : "Janela de 24 horas fechada: só modelo aprovado pela Meta."}>{aberta ? `Aberta até ${horaJanela(conversa!.serviceWindowExpiresAt!)}` : "Janela fechada"}</Janela></span>
        </CabecalhoNome>
        {conversa && (
          <AcoesCabecalho>
            <IconButton icon={StarIcon} label={conversa.starred ? "Tirar dos favoritos" : "Favoritar"} variant="ghost" size="sm" aria-pressed={conversa.starred} onClick={() => void organizar(phone, { favoritar: !conversa.starred })} />
            <IconButton icon={IdentificationCardIcon} label={painel ? "Fechar a ficha" : "Ficha do contato"} variant="ghost" size="sm" aria-pressed={painel} onClick={() => setPainel(!painel)} />
            <Menu label="Mais ações" align="end" width="15rem" trigger={(props) => <IconButton {...props} icon={DotsThreeVerticalIcon} label="Mais ações" variant="ghost" size="sm" />}>
              <MenuItem icon={conversa.pinned ? PushPinSlashIcon : PushPinIcon} onSelect={() => void organizar(phone, { fixar: !conversa.pinned })}>{conversa.pinned ? "Desafixar" : "Fixar no topo"}</MenuItem>
              <MenuItem icon={EnvelopeSimpleIcon} onSelect={() => void organizar(phone, { naoLida: true })}>Marcar como não lida</MenuItem>
              <MenuItem icon={ArchiveIcon} onSelect={() => { void organizar(phone, { arquivar: !conversa.archived }); if (!conversa.archived) setSelecionado(undefined); }}>{conversa.archived ? "Desarquivar" : "Arquivar"}</MenuItem>
              <MenuSeparator />
              <MenuItem icon={TagIcon} onSelect={() => setPainel(true)}>Etiquetas</MenuItem>
            </Menu>
          </AcoesCabecalho>
        )}
      </Cabecalho>

      <Mensagens ref={area} onScroll={aoRolar} aria-live="polite"
        onLoadCapture={(e) => { /* foto ou vídeo terminou de carregar: quem estava no fim continua no fim */ if (noFim && (e.target instanceof HTMLImageElement || e.target instanceof HTMLVideoElement)) area.current?.scrollTo({ top: area.current.scrollHeight }); }}
        onPlayCapture={(e) => { /* um áudio ou vídeo por vez, como na Le Ange */ area.current?.querySelectorAll<HTMLMediaElement>("audio, video").forEach((midia) => { if (midia !== e.target && !midia.paused) midia.pause(); }); }}>
        {fio?.carregandoAntigas && <Dia><span>Carregando mensagens anteriores…</span></Dia>}
        {!fio?.nextBefore && fio?.carregado && mensagens.length > 0 && <Dia><span>Início da conversa</span></Dia>}
        {!mensagens.length && (fio?.carregado
          ? <Vazio><div><strong>Nenhuma mensagem ainda</strong>{aberta ? "Escreva abaixo para começar." : "Para iniciar a conversa, envie um modelo aprovado."}</div></Vazio>
          : <Vazio><div>Carregando a conversa…</div></Vazio>)}
        {dias.map((dia) => (
          // Cada dia num bloco: o separador fixo do dia fica preso só dentro do próprio dia (o seguinte o empurra).
          <section key={dia.chave} aria-label={rotuloDoDia(dia.itens[0].m.createdAt)}>
            <Dia><span>{rotuloDoDia(dia.itens[0].m.createdAt)}</span></Dia>
            {dia.itens.map(({ m, primeira }) => (
              <Bolha key={m.id} mensagem={m} primeira={primeira} nomeContato={nome}
                aoResponder={(alvo) => setRespondendo(alvo)} aoReagir={(alvo, x, y) => setMenu({ m: alvo, x, y, soReacao: true })} aoAbrirMenu={(alvo, x, y) => setMenu({ m: alvo, x, y })}
                aoAbrirFoto={abrirFoto} aoIrPara={irPara} aoDescartar={(alvo) => void descartarFalha(phone, alvo.id)} aoReenviar={(alvo) => { setNoFim(true); void reenviarFalha(phone, alvo); }} />
            ))}
          </section>
        ))}
      </Mensagens>

      {!noFim && <IrParaFim type="button" aria-label="Ir para a última mensagem" onClick={irParaFim}><ArrowDownIcon size={18} />{novas > 0 && <span><Contador>{novas}</Contador></span>}</IrParaFim>}

      <Compositor phone={phone} nomeContato={nome} janelaAberta={aberta} bloqueado={Boolean(conversa?.optedOut)} respondendo={respondendo} aoCancelarResposta={() => setRespondendo(null)}
        aoEnviarTexto={(texto, resposta) => { setNoFim(true); void enviarTexto(phone, texto, resposta); }}
        aoEnviarArquivo={(arquivo, extra) => { setNoFim(true); void enviarArquivo(phone, arquivo, extra); }}
        aoAbrirModelo={() => setModelo(true)} aoMedir={setAltura} />
      </Miolo>

      {menu && (
        <MenuContexto x={menu.x} y={menu.y} aoFechar={() => setMenu(null)}
          topo={<div data-reacoes>{REACOES_RAPIDAS.map((emoji) => <button key={emoji} type="button" aria-label={`Reagir com ${emoji}`} onClick={() => { const alvo = menu.m; setMenu(null); void reagir(phone, alvo, emoji); }}>{emoji}</button>)}</div>}
          opcoes={menu.soReacao ? [] : [
            "separador",
            { rotulo: "Responder", icone: <ArrowBendUpLeftIcon size={16} />, aoEscolher: () => setRespondendo(menu.m) },
            ...(textoDaMensagem(menu.m) ? [{ rotulo: "Copiar texto", icone: <CopyIcon size={16} />, aoEscolher: () => void navigator.clipboard?.writeText(textoDaMensagem(menu.m)) }] : []),
            ...(menu.m.hasMedia ? [{ rotulo: "Baixar arquivo", icone: <DownloadSimpleIcon size={16} />, aoEscolher: () => { window.location.href = urlDaMidia(menu.m, true); } }] : []),
          ]} />
      )}
      <Lightbox images={fotos.map((m) => ({ url: m.local?.previewUrl ?? urlDaMidia(m), name: textoDaMensagem(m) || "Foto" }))} index={foto} onClose={() => setFoto(null)} />
      <ModeloDialog phone={phone} aberto={modelo} aoFechar={() => setModelo(false)} aoEnviado={() => void recarregarFio(phone, true)} />
      {painel && conversa && (
        <PainelContato conversa={conversa} mensagens={mensagens} etiquetasSugeridas={etiquetas} aoEtiquetar={(lista) => void organizar(phone, { etiquetas: lista })}
          aoFechar={() => setPainel(false)} aoAbrirFoto={abrirFoto} aoExcluido={() => removerDaLista(phone)} />
      )}
    </ColunaConversa>
  );
}
